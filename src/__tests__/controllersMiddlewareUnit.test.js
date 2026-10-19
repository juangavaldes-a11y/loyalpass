jest.mock('../services/auditService');
jest.mock('../services/passService');
jest.mock('../services/customerService');
jest.mock('../services/pointsService');
jest.mock('../services/promotionService');
jest.mock('../services/authService');
jest.mock('../services/moduleEntitlementService');
jest.mock('../observability', () => ({ captureException: jest.fn() }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../middleware/adminAuthMiddleware', () => (req, res, next) => {
  req.isPlatformAdmin = req.headers['x-admin'] === '1';
  next();
});

const express = require('express');
const request = require('supertest');

const AuditService = require('../services/auditService');
const PassService = require('../services/passService');
const CustomerService = require('../services/customerService');
const PointsService = require('../services/pointsService');
const PromotionService = require('../services/promotionService');
const AuthService = require('../services/authService');
const ModuleEntitlementService = require('../services/moduleEntitlementService');
const ApiKey = require('../models/ApiKey');
const observability = require('../observability');

const AuditController = require('../controllers/auditController');
const PassController = require('../controllers/passController');
const CustomerController = require('../controllers/customerController');
const PointsController = require('../controllers/pointsController');
const PromotionController = require('../controllers/promotionController');
const apiKeyAuth = require('../middleware/authMiddleware');
const adminAuthActual = jest.requireActual('../middleware/adminAuthMiddleware');
const { errorHandler, notFoundHandler } = require('../middleware/errorMiddleware');
const { requireModule } = require('../middleware/moduleEntitlementMiddleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  headers: {},
  path: '/x',
  method: 'GET',
  businessId: 'b1',
  get: jest.fn().mockReturnValue('idem-1'),
  ...overrides,
});

async function call(handler, req) {
  const res = mockRes();
  const next = jest.fn();
  await handler(req, res, next);
  return { res, next };
}

const statusOf = ({ res }) => res.status.mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(ApiKey, 'findOne').mockReset();
});

describe('AuditController', () => {
  test('applies defaults, clamps page size and only forwards plain string filters', async () => {
    AuditService.listAuditLogs.mockResolvedValue({ data: [], pagination: {} });
    const out = await call(AuditController.listAuditLogs, mockReq({
      query: { page: '-3', pageSize: '500', action: 'x', actorType: ['bad'], businessId: '' },
      isPlatformAdmin: true,
    }));
    expect(statusOf(out)).toBe(200);
    const arg = AuditService.listAuditLogs.mock.calls[0][0];
    expect(arg.page).toBe(1);
    expect(arg.pageSize).toBe(100);
    expect(arg.filters.action).toBe('x');
    expect(arg.filters.actorType).toBeUndefined();
    expect(arg.filters.businessId).toBeUndefined();
  });

  test('uses explicit paging values', async () => {
    AuditService.listAuditLogs.mockResolvedValue({ data: [], pagination: {} });
    await call(AuditController.listAuditLogs, mockReq({ query: { page: '2', pageSize: '10' } }));
    expect(AuditService.listAuditLogs.mock.calls[0][0]).toMatchObject({ page: 2, pageSize: 10 });
  });

  test('maps errors', async () => {
    AuditService.listAuditLogs.mockRejectedValueOnce(new Error('Invalid date range'));
    expect(statusOf(await call(AuditController.listAuditLogs, mockReq()))).toBe(400);
    AuditService.listAuditLogs.mockRejectedValueOnce(new Error('Forbidden: Access denied'));
    expect(statusOf(await call(AuditController.listAuditLogs, mockReq()))).toBe(403);
    const boom = new Error('boom');
    AuditService.listAuditLogs.mockRejectedValueOnce(boom);
    expect((await call(AuditController.listAuditLogs, mockReq())).next).toHaveBeenCalledWith(boom);
    AuditService.listAuditLogs.mockRejectedValueOnce({});
    expect((await call(AuditController.listAuditLogs, mockReq())).next).toHaveBeenCalled();
  });
});

describe('PassController', () => {
  test('createPass', async () => {
    expect(statusOf(await call(PassController.createPass, mockReq()))).toBe(400);
    PassService.createPass.mockResolvedValueOnce({});
    expect(statusOf(await call(PassController.createPass, mockReq({ body: { customer_id: 'c' } })))).toBe(201);
    PassService.createPass.mockRejectedValueOnce(new Error('Customer not found'));
    expect(statusOf(await call(PassController.createPass, mockReq({ body: { customer_id: 'c' } })))).toBe(404);
    PassService.createPass.mockRejectedValueOnce(new Error('Pass does not belong to business'));
    expect(statusOf(await call(PassController.createPass, mockReq({ body: { customer_id: 'c' } })))).toBe(404);
    const boom = new Error('boom');
    PassService.createPass.mockRejectedValueOnce(boom);
    expect((await call(PassController.createPass, mockReq({ body: { customer_id: 'c' } }))).next).toHaveBeenCalledWith(boom);
  });

  test('updatePass', async () => {
    expect(statusOf(await call(PassController.updatePass, mockReq({ body: { pass_id: 'p' } })))).toBe(400);
    PassService.updatePass.mockResolvedValueOnce({});
    const body = { pass_id: 'p', customer_id: 'c' };
    expect(statusOf(await call(PassController.updatePass, mockReq({ body })))).toBe(200);
    PassService.updatePass.mockRejectedValueOnce(new Error('Pass not found'));
    expect(statusOf(await call(PassController.updatePass, mockReq({ body })))).toBe(404);
    const boom = new Error('boom');
    PassService.updatePass.mockRejectedValueOnce(boom);
    expect((await call(PassController.updatePass, mockReq({ body }))).next).toHaveBeenCalledWith(boom);
  });

  test('getPassByCustomer', async () => {
    const req = () => mockReq({ params: { customerId: 'c' } });
    PassService.getPassByCustomerId.mockResolvedValueOnce({});
    expect(statusOf(await call(PassController.getPassByCustomer, req()))).toBe(200);
    PassService.getPassByCustomerId.mockRejectedValueOnce(new Error('Pass not found'));
    expect(statusOf(await call(PassController.getPassByCustomer, req()))).toBe(404);
    const boom = new Error('boom');
    PassService.getPassByCustomerId.mockRejectedValueOnce(boom);
    expect((await call(PassController.getPassByCustomer, req())).next).toHaveBeenCalledWith(boom);
  });
});

describe('CustomerController', () => {
  test('createCustomer', async () => {
    expect(statusOf(await call(CustomerController.createCustomer, mockReq({ body: { name: 'n' } })))).toBe(400);

    CustomerService.createCustomer.mockResolvedValueOnce({ id: 'c' });
    const body = { name: 'n', email: 'e', tags: ['a'], marketing_consent: 1 };
    expect(statusOf(await call(CustomerController.createCustomer, mockReq({ body })))).toBe(201);
    expect(CustomerService.createCustomer).toHaveBeenLastCalledWith('b1', 'n', 'e', { tags: ['a'], marketingConsent: true });

    CustomerService.createCustomer.mockResolvedValueOnce(undefined);
    await call(CustomerController.createCustomer, mockReq({ body: { name: 'n', email: 'e', tags: 'x' } }));
    expect(CustomerService.createCustomer).toHaveBeenLastCalledWith('b1', 'n', 'e', { tags: [], marketingConsent: false });

    CustomerService.createCustomer.mockRejectedValueOnce(new Error('Customer already exists'));
    expect(statusOf(await call(CustomerController.createCustomer, mockReq({ body })))).toBe(409);
    const boom = new Error('boom');
    CustomerService.createCustomer.mockRejectedValueOnce(boom);
    expect((await call(CustomerController.createCustomer, mockReq({ body }))).next).toHaveBeenCalledWith(boom);
  });

  test('getCustomer', async () => {
    const req = () => mockReq({ params: { id: 'c' } });
    CustomerService.getCustomer.mockResolvedValueOnce({});
    expect(statusOf(await call(CustomerController.getCustomer, req()))).toBe(200);
    CustomerService.getCustomer.mockRejectedValueOnce(new Error('Customer not found'));
    expect(statusOf(await call(CustomerController.getCustomer, req()))).toBe(404);
    const boom = new Error('boom');
    CustomerService.getCustomer.mockRejectedValueOnce(boom);
    expect((await call(CustomerController.getCustomer, req())).next).toHaveBeenCalledWith(boom);
  });

  test('listCustomers handles arrays, paginated results, missing query and errors', async () => {
    CustomerService.getCustomersByBusiness.mockResolvedValueOnce([{ id: 1 }]);
    let out = await call(CustomerController.listCustomers, mockReq());
    expect(statusOf(out)).toBe(200);
    expect(CustomerService.getCustomersByBusiness).toHaveBeenLastCalledWith('b1', { search: '' });

    CustomerService.getCustomersByBusiness.mockResolvedValueOnce({ data: [{ id: 1 }], pagination: { page: 2 } });
    out = await call(CustomerController.listCustomers, mockReq({ query: { page: '2', pageSize: '1000', search: 'x' } }));
    expect(CustomerService.getCustomersByBusiness).toHaveBeenLastCalledWith('b1', { search: 'x', page: 2, pageSize: 100 });
    expect(out.res.json.mock.calls[0][0].pagination).toEqual({ page: 2 });

    CustomerService.getCustomersByBusiness.mockResolvedValueOnce([]);
    await call(CustomerController.listCustomers, mockReq({ query: { page: 'abc' } }));
    expect(CustomerService.getCustomersByBusiness).toHaveBeenLastCalledWith('b1', { search: '', page: 1, pageSize: 25 });

    CustomerService.getCustomersByBusiness.mockResolvedValueOnce([]);
    await call(CustomerController.listCustomers, mockReq({ query: undefined }));

    CustomerService.getCustomersByBusiness.mockResolvedValueOnce({ data: undefined, pagination: {} });
    out = await call(CustomerController.listCustomers, mockReq());
    expect(out.next).toHaveBeenCalled();

    const boom = new Error('boom');
    CustomerService.getCustomersByBusiness.mockRejectedValueOnce(boom);
    expect((await call(CustomerController.listCustomers, mockReq())).next).toHaveBeenCalledWith(boom);
  });

  test('updateCustomer', async () => {
    const req = () => mockReq({ params: { id: 'c' }, body: { name: 'x' } });
    CustomerService.updateCustomer.mockResolvedValueOnce({});
    expect(statusOf(await call(CustomerController.updateCustomer, req()))).toBe(200);
    const boom = new Error('boom');
    CustomerService.updateCustomer.mockRejectedValueOnce(boom);
    expect((await call(CustomerController.updateCustomer, req())).next).toHaveBeenCalledWith(boom);
  });
});

describe('PointsController', () => {
  const body = { customer_id: 'c', amount: '5' };

  test('getPoints', async () => {
    const req = () => mockReq({ params: { customerId: 'c' } });
    PointsService.getPoints.mockResolvedValueOnce({});
    expect(statusOf(await call(PointsController.getPoints, req()))).toBe(200);
    PointsService.getPoints.mockRejectedValueOnce(new Error('Points not found'));
    expect(statusOf(await call(PointsController.getPoints, req()))).toBe(404);
    const boom = new Error('boom');
    PointsService.getPoints.mockRejectedValueOnce(boom);
    expect((await call(PointsController.getPoints, req())).next).toHaveBeenCalledWith(boom);
  });

  test('addPoints', async () => {
    expect(statusOf(await call(PointsController.addPoints, mockReq({ body: { amount: 1 } })))).toBe(400);
    expect(statusOf(await call(PointsController.addPoints, mockReq({ body: { customer_id: 'c' } })))).toBe(400);

    PointsService.addPoints.mockResolvedValue({});
    expect(statusOf(await call(PointsController.addPoints, mockReq({ body, user: { sub: 'u' } })))).toBe(200);
    expect(PointsService.addPoints.mock.calls[0][3].actorId).toBe('u');
    await call(PointsController.addPoints, mockReq({ body, apiKeyId: 'k' }));
    expect(PointsService.addPoints.mock.calls[1][3].actorId).toBe('k');
    await call(PointsController.addPoints, mockReq({ body, get: undefined }));
    expect(PointsService.addPoints.mock.calls[2][3]).toMatchObject({ actorId: 'b1', idempotencyKey: undefined });

    PointsService.addPoints.mockRejectedValueOnce(new Error('Amount must be greater than 0'));
    expect(statusOf(await call(PointsController.addPoints, mockReq({ body })))).toBe(400);
    PointsService.addPoints.mockRejectedValueOnce(new Error('Customer not found'));
    expect(statusOf(await call(PointsController.addPoints, mockReq({ body })))).toBe(400);
    const boom = new Error('boom');
    PointsService.addPoints.mockRejectedValueOnce(boom);
    expect((await call(PointsController.addPoints, mockReq({ body }))).next).toHaveBeenCalledWith(boom);
  });

  test('redeemPoints', async () => {
    expect(statusOf(await call(PointsController.redeemPoints, mockReq({ body: {} })))).toBe(400);

    PointsService.redeemPoints.mockResolvedValue({});
    expect(statusOf(await call(PointsController.redeemPoints, mockReq({ body, user: { sub: 'u' } })))).toBe(200);
    await call(PointsController.redeemPoints, mockReq({ body, apiKeyId: 'k' }));
    await call(PointsController.redeemPoints, mockReq({ body, get: undefined }));
    expect(PointsService.redeemPoints.mock.calls.map((c) => c[3].actorId)).toEqual(['u', 'k', 'b1']);

    PointsService.redeemPoints.mockRejectedValueOnce(new Error('Insufficient points'));
    expect(statusOf(await call(PointsController.redeemPoints, mockReq({ body })))).toBe(409);
    PointsService.redeemPoints.mockRejectedValueOnce(new Error('other'));
    expect(statusOf(await call(PointsController.redeemPoints, mockReq({ body })))).toBe(400);
  });

  test('getTransactions', async () => {
    const req = (query = {}) => mockReq({ params: { customerId: 'c' }, query });
    PointsService.getTransactions.mockResolvedValue({ data: [] });
    expect(statusOf(await call(PointsController.getTransactions, req({ page: '2', pageSize: '5' })))).toBe(200);
    expect(PointsService.getTransactions).toHaveBeenLastCalledWith('b1', 'c', { page: 2, pageSize: 5 });
    await call(PointsController.getTransactions, req());
    expect(PointsService.getTransactions).toHaveBeenLastCalledWith('b1', 'c', { page: 1, pageSize: 20 });

    PointsService.getTransactions.mockRejectedValueOnce(new Error('Customer not found'));
    expect(statusOf(await call(PointsController.getTransactions, req()))).toBe(404);
    const boom = new Error('boom');
    PointsService.getTransactions.mockRejectedValueOnce(boom);
    expect((await call(PointsController.getTransactions, req())).next).toHaveBeenCalledWith(boom);
  });
});

describe('PromotionController', () => {
  const req = () => mockReq({ params: { id: 'p' }, body: { customer_id: 'c' } });

  test('create and list', async () => {
    PromotionService.createPromotion.mockResolvedValueOnce({});
    expect(statusOf(await call(PromotionController.create, req()))).toBe(201);
    PromotionService.createPromotion.mockRejectedValueOnce(new Error('name is required'));
    expect(statusOf(await call(PromotionController.create, req()))).toBe(400);
    const boom = new Error('boom');
    PromotionService.createPromotion.mockRejectedValueOnce(boom);
    expect((await call(PromotionController.create, req())).next).toHaveBeenCalledWith(boom);

    PromotionService.listPromotions.mockResolvedValueOnce([]);
    expect(statusOf(await call(PromotionController.list, req()))).toBe(200);
    PromotionService.listPromotions.mockRejectedValueOnce(boom);
    expect((await call(PromotionController.list, req())).next).toHaveBeenCalledWith(boom);
  });

  test('update', async () => {
    PromotionService.updatePromotion.mockResolvedValueOnce({});
    expect(statusOf(await call(PromotionController.update, req()))).toBe(200);
    PromotionService.updatePromotion.mockRejectedValueOnce(new Error('Promotion not found'));
    expect(statusOf(await call(PromotionController.update, req()))).toBe(404);
    const boom = new Error('boom');
    PromotionService.updatePromotion.mockRejectedValueOnce(boom);
    expect((await call(PromotionController.update, req())).next).toHaveBeenCalledWith(boom);
  });

  test('redeem', async () => {
    PromotionService.redeemPromotion.mockResolvedValueOnce({});
    expect(statusOf(await call(PromotionController.redeem, req()))).toBe(201);
    for (const [message, status] of [
      ['Idempotency key is required', 400],
      ['Promotion is not active', 400],
      ['Promotion usage limit reached', 400],
      ['Customer is not eligible for this promotion', 403],
      ['Promotion or customer not found', 404],
    ]) {
      PromotionService.redeemPromotion.mockRejectedValueOnce(new Error(message));
      expect(statusOf(await call(PromotionController.redeem, req()))).toBe(status);
    }
    const boom = new Error('boom');
    PromotionService.redeemPromotion.mockRejectedValueOnce(boom);
    expect((await call(PromotionController.redeem, req())).next).toHaveBeenCalledWith(boom);
  });
});

describe('apiKeyAuth middleware', () => {
  test('accepts client bearer sessions and rejects invalid ones', async () => {
    AuthService.verifyToken.mockResolvedValueOnce({ businessId: 'b9', role: 'client_owner' });
    const req = mockReq({ headers: { authorization: 'Bearer tok' }, businessId: undefined });
    const out = await call(apiKeyAuth, req);
    expect(out.next).toHaveBeenCalled();
    expect(req.businessId).toBe('b9');

    AuthService.verifyToken.mockResolvedValueOnce({ businessId: 'b9', role: 'platform_admin' });
    expect(statusOf(await call(apiKeyAuth, mockReq({ headers: { authorization: 'Bearer tok' } })))).toBe(403);
    AuthService.verifyToken.mockResolvedValueOnce(null);
    expect(statusOf(await call(apiKeyAuth, mockReq({ headers: { authorization: 'Bearer tok' } })))).toBe(403);
  });

  test('validates API keys', async () => {
    expect(statusOf(await call(apiKeyAuth, mockReq()))).toBe(401);

    ApiKey.findOne.mockResolvedValueOnce(null);
    expect(statusOf(await call(apiKeyAuth, mockReq({ headers: { 'x-api-key': 'abcdefghijklmnop' } })))).toBe(403);

    ApiKey.findOne.mockResolvedValueOnce({ business_id: 'b7', id: 'k7' });
    const req = mockReq({ headers: { 'x-api-key': 'abcdefghijklmnop' } });
    const out = await call(apiKeyAuth, req);
    expect(out.next).toHaveBeenCalled();
    expect(req).toMatchObject({ businessId: 'b7', apiKeyId: 'k7' });

    ApiKey.findOne.mockRejectedValueOnce(new Error('db down'));
    expect(statusOf(await call(apiKeyAuth, mockReq({ headers: { 'x-api-key': 'abcdefghijklmnop' } })))).toBe(500);
  });
});

describe('adminAuth middleware', () => {
  test('requires a bearer token, validates the session and sets flags', async () => {
    expect(statusOf(await call(adminAuthActual, mockReq()))).toBe(401);

    AuthService.verifyToken.mockResolvedValueOnce(null);
    expect(statusOf(await call(adminAuthActual, mockReq({ headers: { authorization: 'Bearer t' } })))).toBe(401);

    AuthService.verifyToken.mockResolvedValueOnce({ role: 'platform_admin' });
    let req = mockReq({ headers: { authorization: 'Bearer t' } });
    const out = await call(adminAuthActual, req);
    expect(out.next).toHaveBeenCalled();
    expect(req).toMatchObject({ isPlatformAdmin: true, businessId: null });

    AuthService.verifyToken.mockResolvedValueOnce({ role: 'client_owner', businessId: 'b2' });
    req = mockReq({ headers: { authorization: 'Bearer t' } });
    await call(adminAuthActual, req);
    expect(req).toMatchObject({ isPlatformAdmin: false, businessId: 'b2' });

    AuthService.verifyToken.mockRejectedValueOnce(new Error('boom'));
    expect(statusOf(await call(adminAuthActual, mockReq({ headers: { authorization: 'Bearer t' } })))).toBe(500);
  });
});

describe('errorMiddleware', () => {
  const run = (err, req = mockReq()) => {
    const res = mockRes();
    errorHandler(err, req, res, jest.fn());
    return res;
  };

  test.each([
    ['ValidationError', 400],
    ['NotFoundError', 404],
    ['UnauthorizedError', 401],
  ])('maps %s to %i without reporting', (name, status) => {
    const err = Object.assign(new Error('x'), { name });
    const res = run(err);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(observability.captureException).not.toHaveBeenCalled();
  });

  test('uses statusCode, falls back to 500 and reports server faults', () => {
    expect(run(Object.assign(new Error('x'), { statusCode: 422 })).status).toHaveBeenCalledWith(422);

    const res = run(Object.assign(new Error(''), { statusCode: undefined }), mockReq({ id: 'req-1', user: { sub: 'u', businessId: 'b' }, businessId: undefined, isPlatformAdmin: true }));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toMatchObject({ message: 'Internal server error', requestId: 'req-1' });
    expect(observability.captureException).toHaveBeenCalled();
  });

  test('includes the stack only in development and falls back to the request-id header', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = run(new Error('x'), mockReq({ headers: { 'x-request-id': 'hdr' } }));
      const payload = res.json.mock.calls[0][0];
      expect(payload.error).toEqual(expect.any(String));
      expect(payload.requestId).toBe('hdr');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  test('notFoundHandler returns 404 and tolerates missing request ids / tenants', () => {
    let res = mockRes();
    notFoundHandler(mockReq({ headers: { 'x-request-id': 'r' }, businessId: undefined, user: { businessId: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    res = mockRes();
    notFoundHandler(mockReq({ businessId: undefined, id: 'i' }), res);
    expect(res.json.mock.calls[0][0].message).toBe('Route not found: GET /x');
  });
});

describe('requireModule middleware', () => {
  test('rejects unauthenticated, disabled, allows enabled and forwards errors', async () => {
    const guard = requireModule('promotions');
    expect(statusOf(await call(guard, mockReq({ businessId: undefined })))).toBe(401);

    ModuleEntitlementService.isEnabled.mockResolvedValueOnce(false);
    const disabled = await call(guard, mockReq());
    expect(statusOf(disabled)).toBe(403);
    expect(disabled.res.json.mock.calls[0][0].code).toBe('MODULE_DISABLED');

    ModuleEntitlementService.isEnabled.mockResolvedValueOnce(true);
    expect((await call(guard, mockReq())).next).toHaveBeenCalledWith();

    const boom = new Error('boom');
    ModuleEntitlementService.isEnabled.mockRejectedValueOnce(boom);
    expect((await call(guard, mockReq())).next).toHaveBeenCalledWith(boom);
  });
});

describe('moduleRoutes and auditRoutes', () => {
  const buildApp = () => {
    const app = express();
    app.use((req, res, next) => {
      req.businessId = 'b1';
      next();
    });
    app.use('/modules', require('../routes/moduleRoutes'));
    app.use('/audit', require('../routes/auditRoutes'));
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    return app;
  };

  test('module routes list capabilities and forward errors', async () => {
    ModuleEntitlementService.getCapabilities.mockResolvedValueOnce([{ key: 'a' }]);
    let response = await request(buildApp()).get('/modules');
    expect(response.status).toBe(200);
    ModuleEntitlementService.getCapabilities.mockRejectedValueOnce(new Error('bad'));
    response = await request(buildApp()).get('/modules');
    expect(response.status).toBe(500);
  });

  test('audit routes list logs and prune retention', async () => {
    AuditService.listAuditLogs.mockResolvedValueOnce({ data: [], pagination: {} });
    expect((await request(buildApp()).get('/audit')).status).toBe(200);

    let response = await request(buildApp()).delete('/audit/retention');
    expect(response.status).toBe(403);

    AuditService.pruneAuditLogs.mockResolvedValueOnce(4);
    response = await request(buildApp()).delete('/audit/retention?retentionDays=30').set('x-admin', '1');
    expect(response.body.data).toEqual({ deletedCount: 4, retentionDays: 30 });

    AuditService.pruneAuditLogs.mockResolvedValueOnce(0);
    response = await request(buildApp()).delete('/audit/retention').set('x-admin', '1');
    expect(response.body.data.retentionDays).toBe(90);

    AuditService.pruneAuditLogs.mockRejectedValueOnce(new Error('bad'));
    response = await request(buildApp()).delete('/audit/retention').set('x-admin', '1');
    expect(response.status).toBe(500);
  });
});
