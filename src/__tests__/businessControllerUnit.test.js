jest.mock('../services/businessService');
jest.mock('../services/exportService');
jest.mock('../services/supportService');
jest.mock('../services/backupService');
jest.mock('../services/billingService');
jest.mock('../services/moduleEntitlementService');
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const BusinessController = require('../controllers/businessController');
const BusinessService = require('../services/businessService');
const ExportService = require('../services/exportService');
const SupportService = require('../services/supportService');
const BackupService = require('../services/backupService');
const BillingService = require('../services/billingService');
const ModuleEntitlementService = require('../services/moduleEntitlementService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    params: { id: 'b1', userId: 'u1', moduleKey: 'promotions' },
    body: {},
    query: {},
    path: '/x',
    method: 'GET',
    isPlatformAdmin: true,
    get: jest.fn().mockReturnValue('idem-1'),
    ...overrides,
  };
}

const forbiddenReq = (overrides = {}) =>
  mockReq({ isPlatformAdmin: false, businessId: 'other', ...overrides });

async function run(method, req) {
  const res = mockRes();
  const next = jest.fn();
  await BusinessController[method](req, res, next);
  return { res, next };
}

beforeEach(() => jest.clearAllMocks());

describe('BusinessController admin-only handlers', () => {
  test.each([
    ['createBusiness', 'createBusiness', { body: { name: 'Acme' } }],
    ['listBusinesses', 'listBusinesses', {}],
  ])('%s rejects non-admins with 403', async (method, _svc, extra) => {
    const { res } = await run(method, forbiddenReq(extra));
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('createBusiness validates name, succeeds and forwards errors', async () => {
    let out = await run('createBusiness', mockReq({ body: {} }));
    expect(out.res.status).toHaveBeenCalledWith(400);

    BusinessService.createBusiness.mockResolvedValueOnce({ business: { id: 'b1' } });
    out = await run('createBusiness', mockReq({ body: { name: 'Acme' } }));
    expect(out.res.status).toHaveBeenCalledWith(201);

    BusinessService.createBusiness.mockResolvedValueOnce(undefined);
    out = await run('createBusiness', mockReq({ body: { name: 'Acme' } }));
    expect(out.res.status).toHaveBeenCalledWith(201);

    const boom = new Error('boom');
    BusinessService.createBusiness.mockRejectedValueOnce(boom);
    out = await run('createBusiness', mockReq({ body: { name: 'Acme' } }));
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('listBusinesses succeeds and forwards errors', async () => {
    BusinessService.listBusinesses.mockResolvedValueOnce([{ id: 1 }]);
    let out = await run('listBusinesses', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);

    const boom = new Error('boom');
    BusinessService.listBusinesses.mockRejectedValueOnce(boom);
    out = await run('listBusinesses', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });
});

describe('BusinessController tenant-scoped handlers', () => {
  const simple = [
    ['getBusiness', 'getBusiness', 200],
    ['updateOnboarding', 'updateOnboarding', 200],
    ['updateBilling', 'updateBilling', 200],
    ['getQuotaStatus', 'getQuotaStatus', 200],
    ['getSupportPolicy', null, 200],
  ];

  test.each(simple)('%s: 403, success', async (method, _svc, status) => {
    let out = await run(method, forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);

    BusinessService.getBusiness.mockResolvedValue({});
    BusinessService.updateOnboarding.mockResolvedValue({});
    BusinessService.updateBilling.mockResolvedValue({});
    BusinessService.getQuotaStatus.mockResolvedValue({});
    SupportService.getSupportPolicy.mockResolvedValue({});
    out = await run(method, mockReq());
    expect(out.res.status).toHaveBeenCalledWith(status);
  });

  test.each([
    ['getBusiness', () => BusinessService.getBusiness],
    ['updateOnboarding', () => BusinessService.updateOnboarding],
    ['updateBilling', () => BusinessService.updateBilling],
    ['getQuotaStatus', () => BusinessService.getQuotaStatus],
    ['getSupportPolicy', () => SupportService.getSupportPolicy],
    ['exportBusinessData', () => ExportService.exportBusinessData],
    ['deleteBusinessData', () => ExportService.deleteBusinessData],
  ])('%s maps "Business not found" to 404 and others to next', async (method, getMock) => {
    getMock().mockRejectedValueOnce(new Error('Business not found'));
    let out = await run(method, mockReq());
    expect(out.res.status).toHaveBeenCalledWith(404);

    const boom = new Error('boom');
    getMock().mockRejectedValueOnce(boom);
    out = await run(method, mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('updateBusiness: 403 and success', async () => {
    let out = await run('updateBusiness', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);
    BusinessService.updateBusiness.mockResolvedValueOnce({});
    out = await run('updateBusiness', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);

    const boom = new Error('boom');
    BusinessService.updateBusiness.mockRejectedValueOnce(boom);
    out = await run('updateBusiness', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('api key handlers: 403, success, error', async () => {
    for (const [method, svc, status] of [
      ['getApiKeys', BusinessService.getApiKeys, 200],
      ['createApiKey', BusinessService.createApiKey, 201],
      ['rotateApiKey', BusinessService.rotateApiKey, 201],
    ]) {
      let out = await run(method, forbiddenReq());
      expect(out.res.status).toHaveBeenCalledWith(403);
      svc.mockResolvedValueOnce('k');
      out = await run(method, mockReq());
      expect(out.res.status).toHaveBeenCalledWith(status);
      const boom = new Error('boom');
      svc.mockRejectedValueOnce(boom);
      out = await run(method, mockReq());
      expect(out.next).toHaveBeenCalledWith(boom);
    }
  });

  test('backup handlers: 403, success, error', async () => {
    for (const [method, svc] of [
      ['createBackup', BackupService.createBackup],
      ['restoreBackup', BackupService.restoreBackup],
    ]) {
      let out = await run(method, forbiddenReq({ body: { backupId: 'x' } }));
      expect(out.res.status).toHaveBeenCalledWith(403);
      svc.mockResolvedValueOnce({});
      out = await run(method, mockReq({ body: { backupId: 'x' } }));
      expect(out.res.status).toHaveBeenCalledWith(200);
      const boom = new Error('boom');
      svc.mockRejectedValueOnce(boom);
      out = await run(method, mockReq({ body: { backupId: 'x' } }));
      expect(out.next).toHaveBeenCalledWith(boom);
    }
  });

  test('export and delete: 403, json, csv, success', async () => {
    let out = await run('exportBusinessData', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);

    ExportService.exportBusinessData.mockResolvedValueOnce({});
    out = await run('exportBusinessData', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);
    expect(out.res.setHeader).not.toHaveBeenCalled();

    ExportService.exportBusinessData.mockResolvedValueOnce('a,b');
    out = await run('exportBusinessData', mockReq({ query: { format: 'csv' } }));
    expect(out.res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(out.res.send).toHaveBeenCalledWith('a,b');

    out = await run('deleteBusinessData', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);
    ExportService.deleteBusinessData.mockResolvedValueOnce({});
    out = await run('deleteBusinessData', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);
  });
});

describe('BusinessController billing, analytics, team and modules', () => {
  test('createSubscription', async () => {
    BillingService.createSubscription.mockResolvedValueOnce({});
    let out = await run('createSubscription', mockReq({ body: { plan: 'growth' } }));
    expect(out.res.status).toHaveBeenCalledWith(201);

    for (const [message, status] of [
      ['Business not found', 404],
      ['Idempotency key is required', 400],
      ['Unknown billing plan', 400],
    ]) {
      BillingService.createSubscription.mockRejectedValueOnce(new Error(message));
      out = await run('createSubscription', mockReq());
      expect(out.res.status).toHaveBeenCalledWith(status);
    }
    const boom = new Error('boom');
    BillingService.createSubscription.mockRejectedValueOnce(boom);
    out = await run('createSubscription', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('recordPayment', async () => {
    BillingService.recordPayment.mockResolvedValueOnce({});
    let out = await run('recordPayment', mockReq({ body: { amountMinor: 1 } }));
    expect(out.res.status).toHaveBeenCalledWith(201);

    BillingService.recordPayment.mockRejectedValueOnce(new Error('Idempotency key is required'));
    out = await run('recordPayment', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(400);

    const boom = new Error('boom');
    BillingService.recordPayment.mockRejectedValueOnce(boom);
    out = await run('recordPayment', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('getOperationalAnalytics', async () => {
    BusinessService.getOperationalAnalytics.mockResolvedValueOnce({});
    let out = await run('getOperationalAnalytics', mockReq({ query: { days: '7' } }));
    expect(BusinessService.getOperationalAnalytics).toHaveBeenCalledWith('b1', { days: 7 });
    expect(out.res.status).toHaveBeenCalledWith(200);

    BusinessService.getOperationalAnalytics.mockResolvedValueOnce({});
    await run('getOperationalAnalytics', mockReq());
    expect(BusinessService.getOperationalAnalytics).toHaveBeenLastCalledWith('b1', { days: 30 });

    out = await run('getOperationalAnalytics', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);

    BusinessService.getOperationalAnalytics.mockRejectedValueOnce(new Error('Business not found'));
    out = await run('getOperationalAnalytics', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(404);

    const boom = new Error('boom');
    BusinessService.getOperationalAnalytics.mockRejectedValueOnce(boom);
    out = await run('getOperationalAnalytics', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('listTeamMembers', async () => {
    BusinessService.listTeamMembers.mockResolvedValueOnce([]);
    let out = await run('listTeamMembers', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);

    BusinessService.listTeamMembers.mockResolvedValueOnce([]);
    out = await run('listTeamMembers', mockReq({ isPlatformAdmin: false, businessId: 'b1', user: { role: 'client_owner' } }));
    expect(out.res.status).toHaveBeenCalledWith(200);

    out = await run('listTeamMembers', mockReq({ isPlatformAdmin: false, businessId: 'b1', user: { role: 'client_staff' } }));
    expect(out.res.status).toHaveBeenCalledWith(403);

    out = await run('listTeamMembers', mockReq({ isPlatformAdmin: false, businessId: 'b1' }));
    expect(out.res.status).toHaveBeenCalledWith(403);

    out = await run('listTeamMembers', forbiddenReq());
    expect(out.next).toHaveBeenCalled();
  });

  test('updateTeamMember', async () => {
    BusinessService.updateTeamMember.mockResolvedValueOnce({});
    let out = await run('updateTeamMember', mockReq({ body: { role: 'client_staff' } }));
    expect(out.res.status).toHaveBeenCalledWith(200);

    out = await run('updateTeamMember', mockReq({ isPlatformAdmin: false, businessId: 'b1', user: { role: 'client_staff' } }));
    expect(out.res.status).toHaveBeenCalledWith(403);

    for (const [message, status] of [
      ['Team member not found', 404],
      ['Invalid team role', 400],
      ['No team member changes supplied', 400],
    ]) {
      BusinessService.updateTeamMember.mockRejectedValueOnce(new Error(message));
      out = await run('updateTeamMember', mockReq());
      expect(out.res.status).toHaveBeenCalledWith(status);
    }
    const boom = new Error('boom');
    BusinessService.updateTeamMember.mockRejectedValueOnce(boom);
    out = await run('updateTeamMember', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('getModules', async () => {
    ModuleEntitlementService.getCapabilities.mockResolvedValueOnce([]);
    let out = await run('getModules', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(200);

    ModuleEntitlementService.getCapabilities.mockRejectedValueOnce(new Error('Business not found'));
    out = await run('getModules', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(404);

    out = await run('getModules', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(403);

    const boom = new Error('boom');
    ModuleEntitlementService.getCapabilities.mockRejectedValueOnce(boom);
    out = await run('getModules', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });

  test('updateModule', async () => {
    ModuleEntitlementService.setModule.mockResolvedValueOnce({});
    let out = await run('updateModule', mockReq({ body: { enabled: true }, user: { sub: 'sub-1' } }));
    expect(out.res.status).toHaveBeenCalledWith(200);
    expect(ModuleEntitlementService.setModule).toHaveBeenLastCalledWith(expect.objectContaining({ changedBy: 'sub-1' }));

    ModuleEntitlementService.setModule.mockResolvedValueOnce({});
    await run('updateModule', mockReq({ user: { email: 'a@b.c' } }));
    expect(ModuleEntitlementService.setModule).toHaveBeenLastCalledWith(expect.objectContaining({ changedBy: 'a@b.c' }));

    ModuleEntitlementService.setModule.mockResolvedValueOnce({});
    await run('updateModule', mockReq());

    ModuleEntitlementService.setModule.mockRejectedValueOnce(new Error('Business not found'));
    out = await run('updateModule', mockReq());
    expect(out.res.status).toHaveBeenCalledWith(404);

    for (const message of ['Disable A before disabling B', 'A reason is required', 'Enabled must be a boolean', 'Unknown module']) {
      ModuleEntitlementService.setModule.mockRejectedValueOnce(new Error(message));
      out = await run('updateModule', mockReq());
      expect(out.res.status).toHaveBeenCalledWith(400);
    }

    out = await run('updateModule', forbiddenReq());
    expect(out.res.status).toHaveBeenCalledWith(400);

    const boom = new Error('boom');
    ModuleEntitlementService.setModule.mockRejectedValueOnce(boom);
    out = await run('updateModule', mockReq());
    expect(out.next).toHaveBeenCalledWith(boom);
  });
});
