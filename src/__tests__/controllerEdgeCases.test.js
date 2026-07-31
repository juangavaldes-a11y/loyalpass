jest.mock('../services/authService', () => ({
  authenticate: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  log: jest.fn(),
  listAuditLogs: jest.fn(),
}));

jest.mock('../services/customerService', () => ({
  createCustomer: jest.fn(),
  getCustomer: jest.fn(),
  getCustomersByBusiness: jest.fn(),
  updateCustomer: jest.fn(),
}));

jest.mock('../services/passService', () => ({
  createPass: jest.fn(),
  updatePass: jest.fn(),
  getPassByCustomerId: jest.fn(),
}));

jest.mock('../services/pointsService', () => ({
  getPoints: jest.fn(),
  addPoints: jest.fn(),
  redeemPoints: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const AuthController = require('../controllers/authController');
const CustomerController = require('../controllers/customerController');
const PassController = require('../controllers/passController');
const PointsController = require('../controllers/pointsController');
const AuditController = require('../controllers/auditController');
const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');
const CustomerService = require('../services/customerService');
const PassService = require('../services/passService');
const PointsService = require('../services/pointsService');
const logger = require('../utils/logger');

const buildRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe('controller edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for missing auth input', async () => {
    const req = { body: { email: 'admin@example.com' } };
    const res = buildRes();
    const next = jest.fn();

    await AuthController.login(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email and password are required');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when auth credentials are invalid', async () => {
    AuthService.authenticate.mockResolvedValue(null);

    const req = { body: { email: 'admin@example.com', password: 'wrong' } };
    const res = buildRes();
    const next = jest.fn();

    await AuthController.login(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
    expect(AuditService.log).not.toHaveBeenCalled();
  });

  it('returns 400 when required customer fields are missing', async () => {
    const req = { body: { name: 'Only name' }, businessId: 'business-1', path: '/api/customers', method: 'POST' };
    const res = buildRes();
    const next = jest.fn();

    await CustomerController.createCustomer(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Name and email are required');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns 404 for missing customer lookups and 409 for duplicate creation', async () => {
    CustomerService.getCustomer.mockRejectedValue(new Error('Customer not found'));

    const req = { params: { id: 'missing' }, businessId: 'business-1', path: '/api/customers/missing', method: 'GET' };
    const res = buildRes();
    const next = jest.fn();

    await CustomerController.getCustomer(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Customer not found');

    CustomerService.createCustomer.mockRejectedValue(new Error('Customer already exists'));
    const createReq = { body: { name: 'Jane', email: 'jane@example.com' }, businessId: 'business-1', path: '/api/customers', method: 'POST' };
    const createRes = buildRes();

    await CustomerController.createCustomer(createReq, createRes, next);

    expect(createRes.statusCode).toBe(409);
    expect(createRes.body.message).toBe('Customer already exists');
  });

  it('returns 400 for missing pass and points payloads', async () => {
    const createReq = { body: {}, businessId: 'business-1' };
    const createRes = buildRes();
    const createNext = jest.fn();

    await PassController.createPass(createReq, createRes, createNext);
    expect(createRes.statusCode).toBe(400);

    const updateReq = { body: { pass_id: 'p1' }, businessId: 'business-1' };
    const updateRes = buildRes();
    const updateNext = jest.fn();

    await PassController.updatePass(updateReq, updateRes, updateNext);
    expect(updateRes.statusCode).toBe(400);

    const pointsReq = { body: { customer_id: 'c1' }, businessId: 'business-1' };
    const pointsRes = buildRes();
    const pointsNext = jest.fn();

    await PointsController.addPoints(pointsReq, pointsRes, pointsNext);
    expect(pointsRes.statusCode).toBe(400);
  });

  it('returns 404 for missing pass and 409 for insufficient points redemption', async () => {
    PassService.getPassByCustomerId.mockRejectedValue(new Error('Pass not found'));
    const passReq = { params: { customerId: 'missing' }, businessId: 'business-1' };
    const passRes = buildRes();

    await PassController.getPassByCustomer(passReq, passRes, jest.fn());
    expect(passRes.statusCode).toBe(404);

    PointsService.redeemPoints.mockRejectedValue(new Error('Insufficient points'));
    const redeemReq = { body: { customer_id: 'c1', amount: 20 }, businessId: 'business-1' };
    const redeemRes = buildRes();

    await PointsController.redeemPoints(redeemReq, redeemRes, jest.fn());
    expect(redeemRes.statusCode).toBe(409);
  });

  it('returns 400 for invalid audit pagination and date ranges', async () => {
    AuditService.listAuditLogs.mockResolvedValue({ data: [], pagination: {} });

    const req = { query: { page: '0', pageSize: '0' }, businessId: 'business-1', isPlatformAdmin: true };
    const res = buildRes();
    const next = jest.fn();

    await AuditController.listAuditLogs(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toEqual({});

    AuditService.listAuditLogs.mockRejectedValue(new Error('Invalid date range'));
    const invalidReq = { query: { from: 'bad-date' }, businessId: 'business-1', isPlatformAdmin: true };
    const invalidRes = buildRes();

    await AuditController.listAuditLogs(invalidReq, invalidRes, next);

    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.body.message).toBe('Invalid date range');
  });
});
