const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-rate-limit';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';
process.env.RATE_LIMIT_WRITE_WINDOW_MINUTES = '1';
process.env.RATE_LIMIT_WRITE_MAX = '1';

const app = require('../app');
const sequelize = require('../config/db');
const AuthService = require('../services/authService');

describe('write rate limiting', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('write routes return 429 once the write limit is exceeded', async () => {
    const firstResponse = await request(app).post('/api/businesses').send({ name: 'Rate Limited' });
    const secondResponse = await request(app).post('/api/businesses').send({ name: 'Rate Limited' });

    expect(firstResponse.status).toBe(401);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.body.message).toMatch(/Too many write operations/i);
  });
});
