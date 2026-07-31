const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-audit';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

const app = require('../app');
const sequelize = require('../config/db');
const AuthService = require('../services/authService');

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

describe('audit log access', () => {
  let adminToken;
  let firstBusiness;
  let secondBusiness;
  let ownerEmail;
  let ownerPassword;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();

    adminToken = await login('admin@loyalpass.local', 'admin123');

    const firstCreate = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit One' });

    expect(firstCreate.status).toBe(201);
    firstBusiness = firstCreate.body.data.business;
    ownerEmail = firstCreate.body.data.owner.email;
    ownerPassword = firstCreate.body.data.owner.password;

    const secondCreate = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Two' });

    expect(secondCreate.status).toBe(201);
    secondBusiness = secondCreate.body.data.business;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('platform admin can filter by businessId', async () => {
    const response = await request(app)
      .get(`/api/audit-logs?businessId=${secondBusiness.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);

    const businessIds = response.body.data.map((entry) => entry.business_id);
    expect(businessIds.every((id) => id === secondBusiness.id)).toBe(true);
  });

  test('client owner is scoped to their own business audit logs', async () => {
    const ownerToken = await login(ownerEmail, ownerPassword);

    const response = await request(app)
      .get(`/api/audit-logs?businessId=${secondBusiness.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);

    const businessIds = response.body.data.map((entry) => entry.business_id);
    expect(businessIds.every((id) => id === firstBusiness.id)).toBe(true);
  });

  test('invalid date range returns 400', async () => {
    const response = await request(app)
      .get('/api/audit-logs?from=not-a-date')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
