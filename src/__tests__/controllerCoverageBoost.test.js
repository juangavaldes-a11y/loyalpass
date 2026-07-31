jest.mock('../services/customerService', () => ({
  createCustomer: jest.fn(),
  getCustomer: jest.fn(),
  getCustomersByBusiness: jest.fn(),
  updateCustomer: jest.fn(),
}));

jest.mock('../services/businessService', () => ({
  createBusiness: jest.fn(),
  listBusinesses: jest.fn(),
  getBusiness: jest.fn(),
  updateBusiness: jest.fn(),
  updateOnboarding: jest.fn(),
  updateBilling: jest.fn(),
  getQuotaStatus: jest.fn(),
  getApiKeys: jest.fn(),
  createApiKey: jest.fn(),
  rotateApiKey: jest.fn(),
}));

jest.mock('../services/exportService', () => ({
  exportBusinessData: jest.fn(),
  deleteBusinessData: jest.fn(),
}));

jest.mock('../services/supportService', () => ({
  getSupportPolicy: jest.fn(),
}));

jest.mock('../services/backupService', () => ({
  createBackup: jest.fn(),
  restoreBackup: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../utils/tenantAccess', () => ({
  assertPlatformAdmin: jest.fn(),
  assertBusinessAccess: jest.fn(),
}));

const BusinessController = require('../controllers/businessController');
const CustomerController = require('../controllers/customerController');
const CustomerService = require('../services/customerService');
const BusinessService = require('../services/businessService');
const ExportService = require('../services/exportService');
const SupportService = require('../services/supportService');
const BackupService = require('../services/backupService');
const { assertPlatformAdmin, assertBusinessAccess } = require('../utils/tenantAccess');
const logger = require('../utils/logger');

const buildRes = () => {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
  return res;
};

describe('controller coverage boost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('customer controller covers success and error branches', async () => {
    CustomerService.createCustomer.mockResolvedValue({ id: 'c1' });
    CustomerService.getCustomer.mockResolvedValue({ id: 'c1' });
    CustomerService.getCustomersByBusiness.mockResolvedValue([{ id: 'c1' }]);
    CustomerService.updateCustomer.mockResolvedValue({ id: 'c1', name: 'Updated' });

    const createRes = buildRes();
    await CustomerController.createCustomer({ body: { name: 'Jane', email: 'jane@example.com' }, businessId: 'b1', path: '/api/customers', method: 'POST' }, createRes, jest.fn());
    expect(createRes.statusCode).toBe(201);

    const getRes = buildRes();
    await CustomerController.getCustomer({ params: { id: 'c1' }, businessId: 'b1', path: '/api/customers/c1', method: 'GET' }, getRes, jest.fn());
    expect(getRes.statusCode).toBe(200);

    const listRes = buildRes();
    await CustomerController.listCustomers({ businessId: 'b1', path: '/api/customers', method: 'GET' }, listRes, jest.fn());
    expect(listRes.statusCode).toBe(200);

    const updateRes = buildRes();
    await CustomerController.updateCustomer({ params: { id: 'c1' }, businessId: 'b1', body: { name: 'Updated' }, path: '/api/customers/c1', method: 'PUT' }, updateRes, jest.fn());
    expect(updateRes.statusCode).toBe(200);

    const missingRes = buildRes();
    CustomerService.getCustomer.mockRejectedValueOnce(new Error('Customer not found'));
    await CustomerController.getCustomer({ params: { id: 'missing' }, businessId: 'b1', path: '/api/customers/missing', method: 'GET' }, missingRes, jest.fn());
    expect(missingRes.statusCode).toBe(404);

    const invalidRes = buildRes();
    CustomerService.createCustomer.mockRejectedValueOnce(new Error('Customer already exists'));
    await CustomerController.createCustomer({ body: { name: 'Jane', email: 'jane@example.com' }, businessId: 'b1', path: '/api/customers', method: 'POST' }, invalidRes, jest.fn());
    expect(invalidRes.statusCode).toBe(409);

    expect(logger.info).toHaveBeenCalled();
  });

  test('business controller covers admin, access, export, backup, and support branches', async () => {
    assertPlatformAdmin.mockImplementation(() => {});
    assertBusinessAccess.mockImplementation(() => {});

    BusinessService.createBusiness.mockResolvedValue({ business: { id: 'b1' } });
    BusinessService.listBusinesses.mockResolvedValue([{ id: 'b1' }]);
    BusinessService.getBusiness.mockResolvedValue({ id: 'b1' });
    BusinessService.updateBusiness.mockResolvedValue({ id: 'b1', name: 'Updated' });
    BusinessService.updateOnboarding.mockResolvedValue({ id: 'b1', onboarding_status: 'done' });
    BusinessService.updateBilling.mockResolvedValue({ id: 'b1', subscription_status: 'active' });
    BusinessService.getQuotaStatus.mockResolvedValue({ status: 'ok' });
    BusinessService.getApiKeys.mockResolvedValue([{ id: 'k1' }]);
    BusinessService.createApiKey.mockResolvedValue('key-1');
    BusinessService.rotateApiKey.mockResolvedValue('key-2');
    ExportService.exportBusinessData.mockResolvedValue(JSON.stringify({ ok: true }));
    ExportService.deleteBusinessData.mockResolvedValue({ deleted: true });
    SupportService.getSupportPolicy.mockResolvedValue({ plan: 'growth' });
    BackupService.createBackup.mockResolvedValue({ filePath: '/tmp/backup.json' });
    BackupService.restoreBackup.mockResolvedValue({ restored: true });

    const createRes = buildRes();
    await BusinessController.createBusiness({ body: { name: 'Acme' }, path: '/api/businesses', method: 'POST' }, createRes, jest.fn());
    expect(createRes.statusCode).toBe(201);

    const listRes = buildRes();
    await BusinessController.listBusinesses({ path: '/api/businesses', method: 'GET' }, listRes, jest.fn());
    expect(listRes.statusCode).toBe(200);

    const getRes = buildRes();
    await BusinessController.getBusiness({ params: { id: 'b1' }, path: '/api/businesses/b1', method: 'GET' }, getRes, jest.fn());
    expect(getRes.statusCode).toBe(200);

    const updateRes = buildRes();
    await BusinessController.updateBusiness({ params: { id: 'b1' }, body: { name: 'Updated' }, path: '/api/businesses/b1', method: 'PUT' }, updateRes, jest.fn());
    expect(updateRes.statusCode).toBe(200);

    const onboardingRes = buildRes();
    await BusinessController.updateOnboarding({ params: { id: 'b1' }, body: { onboarding_status: 'done' }, path: '/api/businesses/b1/onboarding', method: 'POST' }, onboardingRes, jest.fn());
    expect(onboardingRes.statusCode).toBe(200);

    const billingRes = buildRes();
    await BusinessController.updateBilling({ params: { id: 'b1' }, body: { subscription_status: 'active' }, path: '/api/businesses/b1/billing', method: 'POST' }, billingRes, jest.fn());
    expect(billingRes.statusCode).toBe(200);

    const quotaRes = buildRes();
    await BusinessController.getQuotaStatus({ params: { id: 'b1' }, query: { customers: 2 }, path: '/api/businesses/b1/quota-status', method: 'GET' }, quotaRes, jest.fn());
    expect(quotaRes.statusCode).toBe(200);

    const keysRes = buildRes();
    await BusinessController.getApiKeys({ params: { id: 'b1' }, path: '/api/businesses/b1/api-keys', method: 'GET' }, keysRes, jest.fn());
    expect(keysRes.statusCode).toBe(200);

    const createKeyRes = buildRes();
    await BusinessController.createApiKey({ params: { id: 'b1' }, path: '/api/businesses/b1/api-keys', method: 'POST' }, createKeyRes, jest.fn());
    expect(createKeyRes.statusCode).toBe(201);

    const rotateKeyRes = buildRes();
    await BusinessController.rotateApiKey({ params: { id: 'b1' }, path: '/api/businesses/b1/api-keys/rotate', method: 'POST' }, rotateKeyRes, jest.fn());
    expect(rotateKeyRes.statusCode).toBe(201);

    const backupRes = buildRes();
    await BusinessController.createBackup({ params: { id: 'b1' }, path: '/api/businesses/b1/backup', method: 'POST' }, backupRes, jest.fn());
    expect(backupRes.statusCode).toBe(200);

    const restoreRes = buildRes();
    await BusinessController.restoreBackup({ params: { id: 'b1' }, body: { inputPath: '/tmp/backup.json' }, path: '/api/businesses/b1/restore', method: 'POST' }, restoreRes, jest.fn());
    expect(restoreRes.statusCode).toBe(200);

    const exportRes = buildRes();
    await BusinessController.exportBusinessData({ params: { id: 'b1' }, query: { format: 'csv' }, path: '/api/businesses/b1/export', method: 'GET' }, exportRes, jest.fn());
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.headers['Content-Type']).toBe('text/csv; charset=utf-8');

    const deleteRes = buildRes();
    await BusinessController.deleteBusinessData({ params: { id: 'b1' }, path: '/api/businesses/b1/export', method: 'DELETE' }, deleteRes, jest.fn());
    expect(deleteRes.statusCode).toBe(200);

    const supportRes = buildRes();
    await BusinessController.getSupportPolicy({ params: { id: 'b1' }, path: '/api/businesses/b1/support', method: 'GET' }, supportRes, jest.fn());
    expect(supportRes.statusCode).toBe(200);

    assertPlatformAdmin.mockImplementation(() => { throw new Error('Forbidden: Admin access required'); });
    const deniedRes = buildRes();
    await BusinessController.createBusiness({ body: { name: 'Acme' }, path: '/api/businesses', method: 'POST' }, deniedRes, jest.fn());
    expect(deniedRes.statusCode).toBe(403);

    BusinessService.getBusiness.mockRejectedValueOnce(new Error('Business not found'));
    const notFoundRes = buildRes();
    await BusinessController.getBusiness({ params: { id: 'b2' }, path: '/api/businesses/b2', method: 'GET' }, notFoundRes, jest.fn());
    expect(notFoundRes.statusCode).toBe(404);

    ExportService.exportBusinessData.mockRejectedValueOnce(new Error('Business not found'));
    const exportNotFoundRes = buildRes();
    await BusinessController.exportBusinessData({ params: { id: 'b2' }, query: { format: 'json' }, path: '/api/businesses/b2/export', method: 'GET' }, exportNotFoundRes, jest.fn());
    expect(exportNotFoundRes.statusCode).toBe(404);

    SupportService.getSupportPolicy.mockRejectedValueOnce(new Error('Business not found'));
    const supportNotFoundRes = buildRes();
    await BusinessController.getSupportPolicy({ params: { id: 'b2' }, path: '/api/businesses/b2/support', method: 'GET' }, supportNotFoundRes, jest.fn());
    expect(supportNotFoundRes.statusCode).toBe(404);

    expect(logger.info).toHaveBeenCalled();
  });
});
