const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-tenant';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

const app = require('../app');
const sequelize = require('../config/db');
const { Business, Customer, ApiKey, PortalUser } = require('../models');
const AuthService = require('../services/authService');

async function loginAdmin() {
  const response = await request(app).post('/api/auth/login').send({
    email: 'admin@loyalpass.local',
    password: 'admin123',
  });

  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

describe('tenant isolation and admin flows', () => {
  let adminToken;
  let business;
  let apiKey;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();
    adminToken = await loginAdmin();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('platform admin can create and list businesses', async () => {
    const createResponse = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Coffee Lab',
        brand_color: '#123456',
        text_color: '#ffffff',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.business.name).toBe('Coffee Lab');
    expect(createResponse.body.data.owner.email).toContain('@loyalpass.local');

    business = createResponse.body.data.business;
    apiKey = createResponse.body.data.apiKey;

    const listResponse = await request(app)
      .get('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.count).toBeGreaterThanOrEqual(1);
  });

  test('customer endpoints reject cross-tenant access', async () => {
    const customer = await Customer.create({
      business_id: business.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    await request(app)
      .post('/api/customers')
      .set('X-API-KEY', apiKey)
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    const otherBusiness = await Business.create({
      name: 'Other Shop',
      brand_color: '#000000',
      text_color: '#ffffff',
    });
    await ApiKey.create({ business_id: otherBusiness.id, key: 'other-key-1234567890', active: true });

    const forbidden = await request(app)
      .get(`/api/customers/${customer.id}`)
      .set('X-API-KEY', 'other-key-1234567890');

    expect(forbidden.status).toBe(404);
    expect(forbidden.body.message).toBe('Customer not found');
  });
});
