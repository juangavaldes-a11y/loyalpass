jest.mock('node-fetch');
jest.mock('nodemailer');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-service-layer';

const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');

const sequelize = require('../config/db');
const models = require('../models');
const BillingService = require('../services/billingService');
const BacPaymentService = require('../services/bacPaymentService');
const ModuleEntitlementService = require('../services/moduleEntitlementService');
const BusinessService = require('../services/businessService');
const PromotionService = require('../services/promotionService');
const PointsService = require('../services/pointsService');
const AuditService = require('../services/auditService');
const ExportService = require('../services/exportService');
const PassService = require('../services/passService');
const CustomerService = require('../services/customerService');
const AuthService = require('../services/authService');
const BackupService = require('../services/backupService');
const WebhookService = require('../services/webhookService');
const SupportService = require('../services/supportService');
const ApplePassService = require('../services/applePassService');
const GooglePassService = require('../services/googlePassService');
const { getPassContext } = require('../utils/passContext');
const { getPlanLimits, evaluateQuotaUsage } = require('../utils/planLimits');

const { Business, Customer, Points, Promotion, PortalUser, Subscription, Payment, AuditLog } = models;

async function makeBusiness(overrides = {}) {
  return Business.create({ name: `Biz ${Math.random()}`, ...overrides });
}

async function makeCustomer(business, overrides = {}) {
  const customer = await Customer.create({
    business_id: business.id,
    name: 'Cust',
    email: `c${Math.random()}@example.com`,
    ...overrides,
  });
  const points = await Points.create({ customer_id: customer.id, balance: 0 });
  return { customer, points };
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.WEBHOOK_URL;
  delete process.env.WEBHOOK_SECRET;
});

describe('planLimits', () => {
  test('returns limits with starter fallback and evaluates quotas', () => {
    expect(getPlanLimits()).toEqual(getPlanLimits('starter'));
    expect(getPlanLimits('growth').customers).toBe(1000);
    expect(getPlanLimits('mystery')).toEqual(getPlanLimits('starter'));

    expect(evaluateQuotaUsage({ plan: 'starter', usage: { customers: 50 } }, 'customers').allowed).toBe(true);
    expect(evaluateQuotaUsage({ plan: 'starter', usage: { customers: 500 }, quotas: {} }, 'customers')).toMatchObject({ allowed: false, reason: 'customers quota exceeded' });
    expect(evaluateQuotaUsage({ plan: 'starter', quotas: { x: 1 } }, 'customers')).toMatchObject({ allowed: true, reason: 'No quota configured' });
    expect(evaluateQuotaUsage({ plan: 'starter', usage: undefined, quotas: null }, 'customers').currentUsage).toBe(0);
  });
});

describe('BacPaymentService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  test('requires configuration', async () => {
    delete process.env.BAC_API_BASE_URL;
    delete process.env.BAC_API_KEY;
    await expect(BacPaymentService.createPayment({})).rejects.toThrow('required');
  });

  test('posts to the configured endpoint and returns the body', async () => {
    process.env.BAC_API_BASE_URL = 'https://bac.test/';
    process.env.BAC_API_KEY = 'secret';
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'pay-1' }) });
    await expect(BacPaymentService.createPayment({ amountMinor: 1, currency: 'USD', reference: 'r', returnUrl: 'u', idempotencyKey: 'k' })).resolves.toEqual({ id: 'pay-1' });
    expect(fetch.mock.calls[0][0]).toBe('https://bac.test/payments');

    process.env.BAC_CREATE_PAYMENT_PATH = '/custom';
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await BacPaymentService.createPayment({});
    expect(fetch.mock.calls[1][0]).toBe('https://bac.test/custom');
  });

  test('fails on non-OK responses even with unparsable bodies, and webhook verification is unsupported', async () => {
    process.env.BAC_API_BASE_URL = 'https://bac.test';
    process.env.BAC_API_KEY = 'secret';
    fetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
    await expect(BacPaymentService.createPayment({})).rejects.toThrow('status 502');
    await expect(BacPaymentService.verifyWebhookSignature()).rejects.toThrow('regional BAC integration');
  });
});

describe('BillingService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  test('createSubscription validates input and persists provider results', async () => {
    const business = await makeBusiness();
    await expect(BillingService.createSubscription({ businessId: business.id, plan: 'nope', idempotencyKey: 'k' })).rejects.toThrow('Unknown billing plan');
    await expect(BillingService.createSubscription({ businessId: business.id })).rejects.toThrow('Idempotency key is required');
    await expect(BillingService.createSubscription({ businessId: 'missing', idempotencyKey: 'k' })).rejects.toThrow('Business not found');

    jest.spyOn(BacPaymentService, 'createPayment').mockResolvedValueOnce({ subscriptionId: 'ext-1' });
    const created = await BillingService.createSubscription({ businessId: business.id, plan: 'growth', idempotencyKey: 'k1' });
    expect(created.subscription.status).toBe('incomplete');
    expect(created.subscription.external_id).toBe('ext-1');

    jest.spyOn(BacPaymentService, 'createPayment').mockResolvedValueOnce({ id: 'pay-9' });
    const byId = await BillingService.createSubscription({ businessId: business.id, idempotencyKey: 'k2' });
    expect(byId.subscription.external_id).toBe('pay-9');

    jest.spyOn(BacPaymentService, 'createPayment').mockResolvedValueOnce({});
    const none = await BillingService.createSubscription({ businessId: business.id, idempotencyKey: 'k3' });
    expect(none.subscription.external_id).toBeNull();
  });

  test('createSubscription marks the subscription failed when the provider errors', async () => {
    const business = await makeBusiness();
    jest.spyOn(BacPaymentService, 'createPayment').mockRejectedValueOnce(new Error('provider down'));
    await expect(BillingService.createSubscription({ businessId: business.id, idempotencyKey: 'k4' })).rejects.toThrow('provider down');
    const failed = await Subscription.findOne({ where: { business_id: business.id, status: 'failed' } });
    expect(failed).not.toBeNull();
  });

  test('recordPayment is idempotent and activates subscriptions for paid payments', async () => {
    const business = await makeBusiness();
    const subscription = await Subscription.create({ business_id: business.id, plan: 'starter', provider: 'bac', status: 'incomplete' });

    await expect(BillingService.recordPayment({ businessId: business.id })).rejects.toThrow('Idempotency key is required');

    const paid = await BillingService.recordPayment({ businessId: business.id, subscriptionId: subscription.id, externalId: 'e1', amountMinor: 2900, status: 'paid', idempotencyKey: 'pay-key' });
    expect(paid.paid_at).toBeTruthy();
    await subscription.reload();
    expect(subscription.status).toBe('active');

    const again = await BillingService.recordPayment({ businessId: business.id, idempotencyKey: 'pay-key' });
    expect(again.id).toBe(paid.id);

    const pending = await BillingService.recordPayment({ businessId: business.id, subscriptionId: subscription.id, amountMinor: 1, status: 'pending', idempotencyKey: 'pay-key-2' });
    expect(pending.paid_at).toBeNull();

    const paidNoSubscription = await BillingService.recordPayment({ businessId: business.id, amountMinor: 1, status: 'paid', idempotencyKey: 'pay-key-3' });
    expect(paidNoSubscription.status).toBe('paid');
    expect(await Payment.count({ where: { business_id: business.id } })).toBe(3);
  });
});

describe('ModuleEntitlementService', () => {
  test('lists plan capabilities, honors overrides and answers isEnabled', async () => {
    await expect(ModuleEntitlementService.getCapabilities('missing')).rejects.toThrow('Business not found');
    const business = await makeBusiness();

    let capabilities = await ModuleEntitlementService.getCapabilities(business.id);
    expect(capabilities.every((m) => m.source === 'plan' && m.enabled)).toBe(true);

    await ModuleEntitlementService.setModule({ businessId: business.id, moduleKey: 'promotions', enabled: false, reason: ' not needed ' });
    capabilities = await ModuleEntitlementService.getCapabilities(business.id);
    expect(capabilities.find((m) => m.key === 'promotions')).toMatchObject({ enabled: false, source: 'override', reason: 'not needed' });
    await expect(ModuleEntitlementService.isEnabled(business.id, 'promotions')).resolves.toBe(false);
    await expect(ModuleEntitlementService.isEnabled(business.id, 'points')).resolves.toBe(true);
    await expect(ModuleEntitlementService.isEnabled(business.id, 'unknown')).resolves.toBe(false);
  });

  test('setModule validates input, enforces dependencies and updates existing overrides', async () => {
    const business = await makeBusiness();
    const base = { businessId: business.id };

    await expect(ModuleEntitlementService.setModule({ ...base, moduleKey: 'nope', enabled: true })).rejects.toThrow('Unknown module');
    await expect(ModuleEntitlementService.setModule({ ...base, moduleKey: 'points', enabled: 'yes' })).rejects.toThrow('boolean');
    await expect(ModuleEntitlementService.setModule({ ...base, moduleKey: 'points', enabled: false })).rejects.toThrow('reason is required');
    await expect(ModuleEntitlementService.setModule({ ...base, moduleKey: 'points', enabled: false, reason: '   ' })).rejects.toThrow('reason is required');
    await expect(ModuleEntitlementService.setModule({ ...base, moduleKey: 'customers', enabled: false, reason: 'x' })).rejects.toThrow('Disable');

    await ModuleEntitlementService.setModule({ ...base, moduleKey: 'promotions', enabled: false, reason: 'off', changedBy: 'admin' });
    const reenabled = await ModuleEntitlementService.setModule({ ...base, moduleKey: 'promotions', enabled: true });
    expect(reenabled).toMatchObject({ enabled: true, reason: null, changed_by: null });

    const log = await AuditLog.findOne({ where: { business_id: business.id, action: 'business.module.update' }, order: [['createdAt', 'DESC']] });
    expect(log.metadata.previousEnabled).toBe(false);
  });
});

describe('BusinessService extras', () => {
  test('createBusiness, getBusiness, updateBusiness and listBusinesses', async () => {
    const created = await BusinessService.createBusiness('Service Biz', null, '#fff', '#000');
    expect(created.owner.email).toContain('@');

    await expect(BusinessService.getBusiness('missing')).rejects.toThrow('Business not found');
    const fetched = await BusinessService.getBusiness(created.business.id);
    expect(fetched.name).toBe('Service Biz');

    await expect(BusinessService.updateBusiness('missing', {})).rejects.toThrow('Business not found');
    const updated = await BusinessService.updateBusiness(created.business.id, { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');

    expect((await BusinessService.listBusinesses()).length).toBeGreaterThan(0);
  });

  test('createBusiness propagates persistence errors', async () => {
    await expect(BusinessService.createBusiness(undefined)).rejects.toThrow();
  });

  test('onboarding, billing and quota status', async () => {
    const business = await makeBusiness({ plan: 'growth' });
    await expect(BusinessService.updateOnboarding('missing')).rejects.toThrow('Business not found');
    await expect(BusinessService.updateBilling('missing')).rejects.toThrow('Business not found');
    await expect(BusinessService.getQuotaStatus('missing')).rejects.toThrow('Business not found');

    await expect(BusinessService.updateOnboarding(business.id, { onboarding_status: 'completed' })).resolves.toBeTruthy();
    await expect(BusinessService.updateOnboarding(business.id)).resolves.toBeTruthy();
    await expect(BusinessService.updateBilling(business.id, { subscription_status: 'active' })).resolves.toBeTruthy();
    await expect(BusinessService.updateBilling(business.id)).resolves.toBeTruthy();

    const status = await BusinessService.getQuotaStatus(business.id, { customers: 5 });
    expect(status.plan).toBe('growth');
    expect(status.checks.customers.allowed).toBe(true);
    expect(status.pricing.name).toBe('Growth');

    const customQuota = await makeBusiness({ plan: 'mystery', quota_overrides: { customers: 1 } });
    const custom = await BusinessService.getQuotaStatus(customQuota.id);
    expect(custom.pricing.name).toBe('Starter');
    expect(custom.quotas.customers).toBe(1);
  });

  test('api keys', async () => {
    const business = await makeBusiness();
    const key = await BusinessService.createApiKey(business.id);
    expect(typeof key).toBe('string');
    const listed = await BusinessService.getApiKeys(business.id);
    expect(listed[0].key_hash).toBeUndefined();
    await expect(BusinessService.rotateApiKey(business.id)).resolves.toBeTruthy();
  });

  test('api key helpers propagate failures', async () => {
    const issue = jest.spyOn(models.ApiKey, 'issue').mockRejectedValueOnce(new Error('issue failed'));
    await expect(BusinessService.createApiKey('x')).rejects.toThrow('issue failed');
    issue.mockRestore();

    const findAll = jest.spyOn(models.ApiKey, 'findAll').mockRejectedValueOnce(new Error('list failed'));
    await expect(BusinessService.getApiKeys('x')).rejects.toThrow('list failed');
    findAll.mockRestore();

    const listAll = jest.spyOn(Business, 'findAll').mockRejectedValueOnce(new Error('list failed'));
    await expect(BusinessService.listBusinesses()).rejects.toThrow('list failed');
    listAll.mockRestore();
  });

  test('operational analytics', async () => {
    await expect(BusinessService.getOperationalAnalytics('missing')).rejects.toThrow('Business not found');
    const business = await makeBusiness();
    const { customer, points } = await makeCustomer(business);
    await models.PointTransaction.bulkCreate([
      { business_id: business.id, customer_id: customer.id, points_id: points.id, action: 'earn', amount: 10, balance_after: 10 },
      { business_id: business.id, customer_id: customer.id, points_id: points.id, action: 'redeem', amount: -4, balance_after: 6 },
    ]);
    const analytics = await BusinessService.getOperationalAnalytics(business.id, { days: 7 });
    expect(analytics).toMatchObject({ memberCount: 1, pointsIssued: 10, pointsRedeemed: 4, transactionCount: 2, periodDays: 7 });
    const defaults = await BusinessService.getOperationalAnalytics(business.id);
    expect(defaults.periodDays).toBe(30);
  });

  test('team members', async () => {
    const business = await makeBusiness();
    const member = await PortalUser.create({ email: `m${Math.random()}@x.com`, password_hash: 'h', role: 'client_staff', business_id: business.id, active: true });

    const members = await BusinessService.listTeamMembers(business.id);
    expect(members).toHaveLength(1);
    expect(members[0].password_hash).toBeUndefined();

    await expect(BusinessService.updateTeamMember(business.id, 'nope', { role: 'client_owner' })).rejects.toThrow('Team member not found');
    await expect(BusinessService.updateTeamMember(business.id, member.id, { role: 'god' })).rejects.toThrow('Invalid team role');
    await expect(BusinessService.updateTeamMember(business.id, member.id, {})).rejects.toThrow('No team member changes');
    await expect(BusinessService.updateTeamMember(business.id, member.id, { role: 'client_owner' })).resolves.toMatchObject({ role: 'client_owner' });
    await expect(BusinessService.updateTeamMember(business.id, member.id, { active: 0 })).resolves.toMatchObject({ active: false });
  });
});

describe('PromotionService', () => {
  test('create, list, update', async () => {
    const business = await makeBusiness();
    await expect(PromotionService.createPromotion(business.id, {})).rejects.toThrow('required');
    await expect(PromotionService.createPromotion(business.id, { name: 'x', reward_value: 0 })).rejects.toThrow('required');
    await expect(PromotionService.createPromotion(business.id, { name: 'x', reward_value: -2 })).rejects.toThrow('required');

    const promo = await PromotionService.createPromotion(business.id, {
      name: 'Promo', reward_value: 5, status: 'published',
      audience_rules: { tagsAny: ['vip', '  ', 3, ' gold '], requiresMarketingConsent: 1 },
    });
    expect(promo.audience_rules).toEqual({ tagsAny: ['vip', 'gold'], requiresMarketingConsent: true });

    const defaultRules = await PromotionService.createPromotion(business.id, { name: 'P2', reward_value: 1, audience_rules: { tagsAny: 'bad' } });
    expect(defaultRules.audience_rules.tagsAny).toEqual([]);
    const noRules = await PromotionService.createPromotion(business.id, { name: 'P3', reward_value: 1 });
    expect(noRules.audience_rules.tagsAny).toEqual([]);

    expect((await PromotionService.listPromotions(business.id)).length).toBe(3);

    await expect(PromotionService.updatePromotion(business.id, 'missing', {})).rejects.toThrow('Promotion not found');
    const updated = await PromotionService.updatePromotion(business.id, promo.id, { name: 'New', audience_rules: { tagsAny: ['a'] } });
    expect(updated.audience_rules.tagsAny).toEqual(['a']);
    const plain = await PromotionService.updatePromotion(business.id, promo.id, { name: 'Newer' });
    expect(plain.name).toBe('Newer');
  });

  test('redeem enforces idempotency, eligibility, schedule and limits', async () => {
    const business = await makeBusiness();
    const { customer } = await makeCustomer(business, { tags: ['vip'], marketing_consent: true });
    const { customer: outsider } = await makeCustomer(business, { tags: [], marketing_consent: false });
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);

    const promo = await Promotion.create({ business_id: business.id, name: 'P', reward_value: 3, status: 'published', usage_limit: 1, audience_rules: { tagsAny: ['vip'], requiresMarketingConsent: true } });

    await expect(PromotionService.redeemPromotion(business.id, promo.id, customer.id)).rejects.toThrow('Idempotency key is required');
    await expect(PromotionService.redeemPromotion(business.id, 'missing', customer.id, 'r0')).rejects.toThrow('not found');
    await expect(PromotionService.redeemPromotion(business.id, promo.id, 'missing', 'r0')).rejects.toThrow('not found');
    await expect(PromotionService.redeemPromotion(business.id, promo.id, outsider.id, 'r1')).rejects.toThrow('not eligible');

    const noTags = await makeCustomer(business, { tags: ['other'], marketing_consent: true });
    await expect(PromotionService.redeemPromotion(business.id, promo.id, noTags.customer.id, 'r1b')).rejects.toThrow('not eligible');

    const first = await PromotionService.redeemPromotion(business.id, promo.id, customer.id, 'r2');
    const replay = await PromotionService.redeemPromotion(business.id, promo.id, customer.id, 'r2');
    expect(replay.id).toBe(first.id);
    await expect(PromotionService.redeemPromotion(business.id, promo.id, customer.id, 'r3')).rejects.toThrow('usage limit');

    const notStarted = await Promotion.create({ business_id: business.id, name: 'Future', reward_value: 1, status: 'published', starts_at: future, audience_rules: {} });
    const ended = await Promotion.create({ business_id: business.id, name: 'Past', reward_value: 1, status: 'published', ends_at: past, audience_rules: {} });
    await expect(PromotionService.redeemPromotion(business.id, notStarted.id, customer.id, 'r4')).rejects.toThrow('not active');
    await expect(PromotionService.redeemPromotion(business.id, ended.id, customer.id, 'r5')).rejects.toThrow('not active');

    const unlimited = await Promotion.create({ business_id: business.id, name: 'Open', reward_value: 1, status: 'published', starts_at: past, ends_at: future, audience_rules: {} });
    await expect(PromotionService.redeemPromotion(business.id, unlimited.id, customer.id, 'r6')).resolves.toBeTruthy();
  });
});

describe('PointsService', () => {
  test('getPoints, addPoints, redeemPoints and setBalance', async () => {
    const business = await makeBusiness();
    const { customer } = await makeCustomer(business);

    await expect(PointsService.getPoints(business.id, 'missing')).rejects.toThrow('Points not found');
    expect((await PointsService.getPoints(business.id, customer.id)).balance).toBe(0);

    await expect(PointsService.addPoints(business.id, customer.id, 0)).rejects.toThrow('greater than 0');
    await expect(PointsService.addPoints(business.id, customer.id, 1.5)).rejects.toThrow('greater than 0');
    await expect(PointsService.addPoints(business.id, 'missing', 5)).rejects.toThrow('Customer not found');

    const added = await PointsService.addPoints(business.id, customer.id, 10, { reason: 'r', idempotencyKey: 'idem-a', actorId: 'actor' });
    expect(added.balance).toBe(10);
    const replay = await PointsService.addPoints(business.id, customer.id, 10, { idempotencyKey: 'idem-a' });
    expect(replay.balance).toBe(10);

    await expect(PointsService.redeemPoints(business.id, customer.id, 100)).rejects.toThrow('Insufficient');
    expect((await PointsService.redeemPoints(business.id, customer.id, 4)).balance).toBe(6);

    await expect(PointsService.setBalance(business.id, customer.id, -1)).rejects.toThrow('negative');
    await expect(PointsService.setBalance(business.id, customer.id, 1.5)).rejects.toThrow('negative');
    await expect(PointsService.setBalance(business.id, 'missing', 3)).rejects.toThrow('Customer not found');
    expect((await PointsService.setBalance(business.id, customer.id, 20)).balance).toBe(20);
  });

  test('transactions are paginated and scoped', async () => {
    const business = await makeBusiness();
    const { customer } = await makeCustomer(business);
    await expect(PointsService.getTransactions(business.id, 'missing')).rejects.toThrow('Customer not found');
    for (let i = 0; i < 3; i += 1) await PointsService.addPoints(business.id, customer.id, 1);

    const page = await PointsService.getTransactions(business.id, customer.id, { page: 2, pageSize: 2 });
    expect(page.data).toHaveLength(1);
    expect(page.pagination).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    const clamped = await PointsService.getTransactions(business.id, customer.id, { page: -4, pageSize: 1000 });
    expect(clamped.pagination).toMatchObject({ page: 1, pageSize: 100 });
    const defaults = await PointsService.getTransactions(business.id, customer.id);
    expect(defaults.pagination.pageSize).toBe(20);
  });

  test('webhook notifications are best-effort', async () => {
    const business = await makeBusiness();
    const { customer } = await makeCustomer(business);
    process.env.WEBHOOK_URL = 'https://hooks.test/x';
    process.env.WEBHOOK_SECRET = 's';

    const deliver = jest.spyOn(WebhookService, 'deliver').mockResolvedValueOnce({ ok: true });
    await PointsService.addPoints(business.id, customer.id, 2);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://hooks.test/x', secret: 's' }));

    deliver.mockRejectedValueOnce(new Error('hook down'));
    await expect(PointsService.addPoints(business.id, customer.id, 2)).resolves.toBeTruthy();
    deliver.mockRestore();
  });
});

describe('AuditService', () => {
  test('log swallows persistence errors; prune removes expired rows', async () => {
    const create = jest.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('db'));
    await expect(AuditService.log({ actorType: 'user', actorId: 'a', action: 'x', entityType: 'y' })).resolves.toBeUndefined();
    create.mockRestore();

    const business = await makeBusiness();
    await AuditService.log({ businessId: business.id, actorType: 'user', actorId: 'a', action: 'old', entityType: 'y' });
    await AuditLog.update({ createdAt: new Date(Date.now() - 400 * 86400000) }, { where: { action: 'old' }, silent: true });
    expect(await AuditService.pruneAuditLogs({ retentionDays: 30 })).toBeGreaterThan(0);
    expect(await AuditService.pruneAuditLogs()).toBe(0);
  });

  test('listAuditLogs applies filters, tenancy and date validation', async () => {
    const business = await makeBusiness();
    await AuditService.log({ businessId: business.id, actorType: 'user', actorId: 'actor-1', action: 'a.b', entityType: 'thing', entityId: 'e1' });

    const filters = { actorType: 'user', actorId: 'actor-1', action: 'a.b', entityType: 'thing', entityId: 'e1' };
    const admin = await AuditService.listAuditLogs({ filters: { ...filters, businessId: business.id }, user: { isPlatformAdmin: true } });
    expect(admin.data).toHaveLength(1);
    expect((await AuditService.listAuditLogs({ user: { isPlatformAdmin: true } })).pagination.page).toBe(1);

    const scoped = await AuditService.listAuditLogs({ filters, user: { businessId: business.id } });
    expect(scoped.pagination.total).toBe(1);

    await expect(AuditService.listAuditLogs({ user: {} })).rejects.toThrow('Forbidden');
    await expect(AuditService.listAuditLogs({ user: { isPlatformAdmin: true }, filters: { from: 'garbage' } })).rejects.toThrow('Invalid date range');
    await expect(AuditService.listAuditLogs({ user: { isPlatformAdmin: true }, filters: { to: 'garbage' } })).rejects.toThrow('Invalid date range');

    const range = await AuditService.listAuditLogs({ page: 0, pageSize: 0, user: { isPlatformAdmin: true }, filters: { from: '2000-01-01', to: '2999-01-01' } });
    expect(range.pagination).toMatchObject({ page: 1, pageSize: 1 });
    await AuditService.listAuditLogs({ user: { isPlatformAdmin: true }, filters: { from: '2000-01-01' } });
    await AuditService.listAuditLogs({ user: { isPlatformAdmin: true }, filters: { to: '2999-01-01' } });
    const empty = await AuditService.listAuditLogs({ user: { isPlatformAdmin: true }, filters: { action: 'does-not-exist' } });
    expect(empty.pagination.totalPages).toBe(1);
  });
});

describe('ExportService', () => {
  test('exports json/csv and deletes tenant data', async () => {
    await expect(ExportService.exportBusinessData('missing')).rejects.toThrow('Business not found');
    await expect(ExportService.deleteBusinessData('missing')).rejects.toThrow('Business not found');

    const business = await makeBusiness();
    const { customer, points } = await makeCustomer(business, { name: 'Zed' });
    await points.update({ balance: 7 });
    await Customer.create({ business_id: business.id, name: 'N', email: 'n@x.com' });

    const json = JSON.parse(await ExportService.exportBusinessData(business.id));
    expect(json.customers.length).toBeGreaterThan(0);
    expect(await ExportService.exportBusinessData(business.id, 'json')).toContain('"business"');

    const csv = await ExportService.exportBusinessData(business.id, 'csv');
    expect(csv.split('\n')[0]).toBe('type,id,name,email,balance');
    expect(csv).toContain('Zed');
    expect(csv).toContain(`points,${customer.id},,,7`);

    expect(ExportService.toCsv({ customers: [{ id: 1 }], points: [{ customer_id: 1 }] })).toContain('customer,1,,,');

    await expect(ExportService.deleteBusinessData(business.id)).resolves.toEqual({ deleted: true, businessId: business.id });
    expect(await Customer.count({ where: { business_id: business.id } })).toBe(0);
  });
});

describe('PassService and wallet providers', () => {
  test('createPass tolerates provider failures and updatePass/getPass cover branches', async () => {
    const business = await makeBusiness();
    const { customer } = await makeCustomer(business);
    const { customer: secondCustomer } = await makeCustomer(business);

    await expect(PassService.createPass(business.id, 'missing')).rejects.toThrow('not found');

    const apple = jest.spyOn(ApplePassService, 'generatePass').mockRejectedValueOnce(new Error('apple'));
    const google = jest.spyOn(GooglePassService, 'generatePass').mockRejectedValueOnce(new Error('google'));
    const failed = await PassService.createPass(business.id, customer.id);
    expect(failed.applePassSerial).toBeNull();
    expect(failed.googlePassObjectId).toBeNull();

    apple.mockResolvedValueOnce('serial-1');
    google.mockResolvedValueOnce('obj-1');
    const ok = await PassService.createPass(business.id, secondCustomer.id);
    expect(ok.applePassSerial).toBe('serial-1');

    const applePassUpdate = jest.spyOn(ApplePassService, 'updatePass').mockResolvedValueOnce(undefined);
    const googlePassUpdate = jest.spyOn(GooglePassService, 'updatePass').mockResolvedValueOnce(undefined);
    await PassService.updatePass(business.id, ok.pass.id, secondCustomer.id, 5);
    expect(applePassUpdate).toHaveBeenCalledWith('serial-1', 5);
    expect(googlePassUpdate).toHaveBeenCalledWith('obj-1', 5);

    applePassUpdate.mockRejectedValueOnce(new Error('apple update'));
    googlePassUpdate.mockRejectedValueOnce(new Error('google update'));
    await expect(PassService.updatePass(business.id, ok.pass.id, secondCustomer.id, 6)).resolves.toBeTruthy();

    await expect(PassService.updatePass(business.id, failed.pass.id, customer.id, 1)).resolves.toBeTruthy();
    await expect(PassService.updatePass(business.id, 'missing', customer.id, 1)).rejects.toThrow('Pass not found');

    await expect(PassService.getPassByCustomerId(business.id, customer.id)).resolves.toBeTruthy();
    await expect(PassService.getPassByCustomerId(business.id, 'missing')).rejects.toThrow('Pass not found');
    [apple, google, applePassUpdate, googlePassUpdate].forEach((spy) => spy.mockRestore());
  });

  test('getPassContext rejects cross-tenant, missing business and missing points', async () => {
    const business = await makeBusiness();
    const other = await makeBusiness();
    const { customer } = await makeCustomer(business);
    await expect(getPassContext(other.id, customer.id)).rejects.toThrow('does not belong');
    await expect(getPassContext(business.id, 'missing')).rejects.toThrow('does not belong');

    const bare = await Customer.create({ business_id: business.id, name: 'B', email: 'bare@x.com' });
    await Points.destroy({ where: { customer_id: bare.id } });
    await expect(getPassContext(business.id, bare.id)).rejects.toThrow('Points record not found');

    const lookup = jest.spyOn(Business, 'findByPk').mockResolvedValueOnce(null);
    await expect(getPassContext(business.id, customer.id)).rejects.toThrow('Business not found');
    lookup.mockRestore();
    await expect(getPassContext(business.id, customer.id)).resolves.toHaveProperty('points');
  });

  test('wallet providers skip gracefully without credentials', async () => {
    const business = await makeBusiness();
    const { customer, points } = await makeCustomer(business);
    await expect(ApplePassService.generatePass(business.toJSON(), customer.toJSON(), points.toJSON())).resolves.toBeNull();
    await expect(GooglePassService.generatePass(business.id, customer.id, business.toJSON(), customer.toJSON(), points.toJSON())).resolves.toBeNull();
    await expect(GooglePassService.createPassClass(business.id, business.toJSON())).resolves.toBeNull();
    await expect(GooglePassService.getClient()).rejects.toThrow('not configured');
  });
});

describe('CustomerService', () => {
  test('create, get, list, update', async () => {
    const business = await makeBusiness();
    const created = await CustomerService.createCustomer(business.id, 'Ann', 'ann@x.com', { tags: ['a'], marketingConsent: true });
    await expect(CustomerService.createCustomer(business.id, 'Ann', 'ann@x.com')).rejects.toThrow('already exists');
    await CustomerService.createCustomer(business.id, 'Bob', 'bob@x.com');

    expect((await CustomerService.getCustomer(business.id, created.id)).points).toBe(0);
    await expect(CustomerService.getCustomer(business.id, 'missing')).rejects.toThrow('Customer not found');

    expect(await CustomerService.getCustomersByBusiness(business.id)).toHaveLength(2);
    expect(await CustomerService.getCustomersByBusiness(business.id, { search: '  ann ' })).toHaveLength(1);
    const paged = await CustomerService.getCustomersByBusiness(business.id, { page: 2, pageSize: 1 });
    expect(paged.pagination).toMatchObject({ page: 2, total: 2, totalPages: 2 });
    expect((await CustomerService.getCustomersByBusiness(business.id, { page: 1 })).length).toBe(2);
    expect(await CustomerService.getCustomersByBusiness(business.id, { search: 'zzz', page: 1, pageSize: 5 })).toMatchObject({ pagination: { totalPages: 1 } });

    const updated = await CustomerService.updateCustomer(business.id, created.id, { name: 'Ann B' });
    expect(updated.name).toBe('Ann B');
    await expect(CustomerService.updateCustomer(business.id, 'missing', {})).rejects.toThrow('Customer not found');

    const find = jest.spyOn(Customer, 'findAll').mockRejectedValueOnce(new Error('db'));
    await expect(CustomerService.getCustomersByBusiness(business.id)).rejects.toThrow('db');
    find.mockRestore();
  });
});

describe('AuthService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  test('seed, authenticate and verify tokens', async () => {
    delete process.env.PLATFORM_ADMIN_EMAIL;
    await expect(AuthService.seedDefaultPlatformAdmin()).resolves.toBeNull();

    process.env.PLATFORM_ADMIN_EMAIL = 'root@loyalpass.test';
    process.env.PLATFORM_ADMIN_PASSWORD = 'pw12345';
    const seeded = await AuthService.seedDefaultPlatformAdmin();
    expect(seeded.role).toBe('platform_admin');
    expect((await AuthService.seedDefaultPlatformAdmin()).id).toBe(seeded.id);

    await expect(AuthService.authenticate('nobody@x.com', 'pw')).resolves.toBeNull();
    await expect(AuthService.authenticate('root@loyalpass.test', 'wrong')).resolves.toBeNull();
    const session = await AuthService.authenticate('root@loyalpass.test', 'pw12345');
    expect(session.accessToken).toBeTruthy();
    expect((await AuthService.verifyToken(session.accessToken)).email).toBe('root@loyalpass.test');
    await expect(AuthService.verifyToken('')).resolves.toBeNull();

    const business = await makeBusiness({ name: '!!!' });
    const { email } = await AuthService.createBusinessOwnerUser(business, 'pw');
    expect(email.startsWith('business.')).toBe(true);
    const owner = await AuthService.authenticate(email, 'pw');
    expect(owner.user.business_id).toBe(business.id);
  });
});

describe('BackupService', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-backup-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('createBackup validates input and restoreBackup validates backups', async () => {
    await expect(BackupService.createBackup()).rejects.toThrow('Business ID is required');
    await expect(BackupService.createBackup({ businessId: 'missing', outputPath: dir })).rejects.toThrow('Business not found');
    await expect(BackupService.restoreBackup()).rejects.toThrow('Business ID is required');
    await expect(BackupService.restoreBackup({ businessId: 'b', backupId: '../evil.json', outputPath: dir })).rejects.toThrow('Invalid backup ID');
    await expect(BackupService.restoreBackup({ businessId: 'b', outputPath: dir })).rejects.toThrow('Invalid backup ID');
    await expect(BackupService.restoreBackup({ businessId: 'b', backupId: 'loyalpass-backup-nope.json', outputPath: dir })).rejects.toThrow('Backup file not found');
  });

  test('round trips a business with and without data, and rejects mismatches', async () => {
    const empty = await makeBusiness();
    const emptyBackup = await BackupService.createBackup({ businessId: empty.id, outputPath: dir });
    expect(emptyBackup.recordCount).toBeGreaterThan(0);
    await expect(BackupService.restoreBackup({ businessId: empty.id, backupId: emptyBackup.backupId, outputPath: dir })).resolves.toMatchObject({ restored: true });

    const business = await makeBusiness();
    const { customer } = await makeCustomer(business);
    const promo = await Promotion.create({ business_id: business.id, name: 'P', reward_value: 1, status: 'published', audience_rules: {} });
    await models.PromotionRedemption.create({ promotion_id: promo.id, business_id: business.id, customer_id: customer.id, idempotency_key: 'bk', reward_value: 1 });

    const backup = await BackupService.createBackup({ businessId: business.id, outputPath: dir });
    await expect(BackupService.restoreBackup({ businessId: business.id, backupId: backup.backupId, outputPath: dir })).resolves.toMatchObject({ restored: true });
    await expect(BackupService.restoreBackup({ businessId: empty.id, backupId: backup.backupId, outputPath: dir })).rejects.toThrow('does not match');

    process.env.BACKUP_DIRECTORY = dir;
    const viaEnv = await BackupService.createBackup({ businessId: business.id });
    expect(fs.existsSync(path.join(dir, viaEnv.backupId))).toBe(true);
    delete process.env.BACKUP_DIRECTORY;
  });
});

describe('WebhookService', () => {
  test('signs payloads and handles delivery results', async () => {
    expect(WebhookService.createSignature(null, {}, '1')).toBeNull();
    expect(WebhookService.createSignature('s', { a: 1 }, '1')).toBe(WebhookService.createSignature('s', '{"a":1}', '1'));
    await expect(WebhookService.deliver({})).rejects.toThrow('Webhook URL is required');

    fetch.mockResolvedValueOnce({ ok: true, status: 202 });
    await expect(WebhookService.deliver({ url: 'https://h.test', secret: 's', event: 'e', payload: { a: 1 }, headers: { 'X-Extra': '1' } })).resolves.toEqual({ ok: true, status: 202 });
    expect(fetch.mock.calls[0][1].headers['X-LoyalPass-Signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await WebhookService.deliver({ url: 'https://h.test', event: 'e', payload: 'raw' });
    expect(fetch.mock.calls[1][1].headers['X-LoyalPass-Signature']).toBeUndefined();

    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(WebhookService.deliver({ url: 'https://h.test', event: 'e', payload: {} })).rejects.toThrow('status 500');
  });
});

describe('SupportService', () => {
  test('returns plan-specific policies', async () => {
    await expect(SupportService.getSupportPolicy('missing')).rejects.toThrow('Business not found');
    for (const [plan, response] of [['starter', '2 business days'], ['growth', '1 business day'], ['enterprise', '4 hours']]) {
      const business = await makeBusiness({ plan });
      expect((await SupportService.getSupportPolicy(business.id)).responseTime).toBe(response);
    }
    const fallback = await makeBusiness({ plan: 'mystery' });
    expect((await SupportService.getSupportPolicy(fallback.id)).plan).toBe('starter');
  });
});

describe('EmailService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
    jest.resetModules();
  });

  function loadWithSmtp(smtp) {
    jest.resetModules();
    jest.doMock('../config/env', () => ({ smtp }));
    jest.doMock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }) })) }));
    const mailer = require('nodemailer');
    return { EmailService: require('../services/emailService'), mailer };
  }

  test('requires SMTP configuration and message fields', async () => {
    const { EmailService } = loadWithSmtp({});
    await expect(EmailService.send({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow('SMTP_HOST');
    await expect(EmailService.send({})).rejects.toThrow('required');
    await expect(EmailService.send({ to: 'a@b.c', subject: 's' })).rejects.toThrow('required');
  });

  test('sends mail and caches the transporter, with and without credentials', async () => {
    let loaded = loadWithSmtp({ host: 'smtp.test', port: 25, secure: false, from: 'noreply@test', user: 'u', password: 'p' });
    await loaded.EmailService.send({ to: 'a@b.c', subject: 's', html: '<p>x</p>', replyTo: 'r@b.c' });
    await loaded.EmailService.sendBusinessOwnerInvite({ to: 'a@b.c', businessName: 'Biz', temporaryPassword: 'pw' });
    expect(loaded.mailer.createTransport).toHaveBeenCalledTimes(1);
    expect(loaded.mailer.createTransport.mock.calls[0][0].auth).toEqual({ user: 'u', pass: 'p' });

    loaded = loadWithSmtp({ host: 'smtp.test', port: 25, secure: false, from: 'noreply@test' });
    await loaded.EmailService.send({ to: 'a@b.c', subject: 's', text: 't' });
    expect(loaded.mailer.createTransport.mock.calls[0][0].auth).toBeUndefined();
  });
});
