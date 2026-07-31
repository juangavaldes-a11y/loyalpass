const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-auth';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

const app = require('../app');
const sequelize = require('../config/db');
const AuthService = require('../services/authService');

describe('backend auth', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('login returns signed session data', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@loyalpass.local',
      password: 'admin123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.role).toBe('platform_admin');
  });
});
