const request = require('supertest');
const { createCustomerWithPoints } = require('../services/customerLifecycleService');
const CustomerService = require('../services/customerService');
const PassService = require('../services/passService');
const AuthService = require('../services/authService');
const sequelize = require('../config/db');
const app = require('../app');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-controllers';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

describe('controller and service edge cases', () => {
  let adminToken;
  let apiKey;
  let businessId;
  let customerId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@loyalpass.local',
      password: 'admin123',
    });
    adminToken = loginResponse.body.data.accessToken;

    const businessResponse = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coverage Business' });

    businessId = businessResponse.body.data.business.id;
    apiKey = businessResponse.body.data.apiKey;

    const customerResponse = await request(app)
      .post('/api/customers')
      .set('x-api-key', apiKey)
      .send({ name: 'Coverage Customer', email: 'coverage@example.com' });

    expect(customerResponse.status).toBe(201);
    customerId = customerResponse.body.data.id || customerResponse.body.data.customer?.id;
    expect(customerId).toBeDefined();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('customer service returns not found paths and duplicate handling', async () => {
    await expect(CustomerService.getCustomer('missing-business', 'missing-customer')).rejects.toThrow();
    await expect(CustomerService.updateCustomer(businessId, 'missing-customer', { name: 'x' })).rejects.toThrow();
    await expect(CustomerService.createCustomer(businessId, 'Coverage Customer', 'coverage@example.com')).rejects.toThrow();
  });

  test('points and pass endpoints exercise service flows', async () => {
    const addResponse = await request(app)
      .post('/api/points/add')
      .set('x-api-key', apiKey)
      .send({ customer_id: customerId, amount: 10 });

    expect(addResponse.status).toBe(200);

    const redeemResponse = await request(app)
      .post('/api/points/redeem')
      .set('x-api-key', apiKey)
      .send({ customer_id: customerId, amount: 3 });

    expect(redeemResponse.status).toBe(200);

    const getPointsResponse = await request(app)
      .get(`/api/points/${customerId}`)
      .set('x-api-key', apiKey);

    expect(getPointsResponse.status).toBe(200);

    const createPassResponse = await request(app)
      .post('/api/passes/create')
      .set('x-api-key', apiKey)
      .send({ customer_id: customerId });

    expect(createPassResponse.status).toBe(201);

    const passId = createPassResponse.body.data.pass.id;
    const updatePassResponse = await request(app)
      .post('/api/passes/update')
      .set('x-api-key', apiKey)
      .send({ pass_id: passId, customer_id: customerId });

    expect(updatePassResponse.status).toBe(200);

    const getPassResponse = await request(app)
      .get(`/api/passes/${customerId}`)
      .set('x-api-key', apiKey);

    expect(getPassResponse.status).toBe(200);
  });

  test('business routes exercise onboarding, billing, quotas, and API keys', async () => {
    const onboardingResponse = await request(app)
      .post(`/api/businesses/${businessId}/onboarding`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ onboarding_status: 'completed', plan: 'growth' });

    expect(onboardingResponse.status).toBe(200);

    const billingResponse = await request(app)
      .post(`/api/businesses/${businessId}/billing`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subscription_status: 'active' });

    expect(billingResponse.status).toBe(200);

    const quotaResponse = await request(app)
      .get(`/api/businesses/${businessId}/quota-status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(quotaResponse.status).toBe(200);

    const keysResponse = await request(app)
      .get(`/api/businesses/${businessId}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(keysResponse.status).toBe(200);

    const createKeyResponse = await request(app)
      .post(`/api/businesses/${businessId}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(createKeyResponse.status).toBe(201);
  });

  test('auth middleware and helpers cover error paths', async () => {
    const missingApiKeyResponse = await request(app).get('/api/customers');
    expect(missingApiKeyResponse.status).toBe(401);

    const invalidTokenResponse = await AuthService.verifyToken('bad-token');
    expect(invalidTokenResponse).toBeNull();

    const missingRouteResponse = await request(app).get('/definitely-missing-route');
    expect(missingRouteResponse.status).toBe(401);
  });

  test('customer lifecycle helper creates customer with points', async () => {
    const createdCustomer = await sequelize.models.Customer.create({
      id: 'cust-helper',
      business_id: businessId,
      name: 'Helper',
      email: 'helper@example.com',
    });

    const customer = await createCustomerWithPoints(createdCustomer.toJSON());

    expect(customer.customer.id).toBe('cust-helper');
    expect(customer.points.customer_id).toBe('cust-helper');
  });
});
