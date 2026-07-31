const request = require('supertest');
const sequelize = require('../config/db');
const app = require('../app');
const AuthService = require('../services/authService');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-monitoring';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

describe('monitoring and support endpoints', () => {
  let adminToken;
  let businessId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@loyalpass.local',
      password: 'admin123',
    });
    adminToken = login.body.data.accessToken;

    const business = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Monitoring Business' });

    businessId = business.body.data.business.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('exposes health diagnostics and support policy metadata', async () => {
    const healthResponse = await request(app).get('/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe('ok');
    expect(healthResponse.body.service).toBe('loyalpass');
    expect(healthResponse.body.uptimeSeconds).toBeGreaterThan(0);

    const supportResponse = await request(app)
      .get(`/api/businesses/${businessId}/support`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(supportResponse.status).toBe(200);
    expect(supportResponse.body.success).toBe(true);
    expect(supportResponse.body.data.support).toMatchObject({
      plan: expect.any(String),
      responseTime: expect.any(String),
      channel: expect.any(String),
    });
  });
});
