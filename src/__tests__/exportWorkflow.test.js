const request = require('supertest');
const sequelize = require('../config/db');
const app = require('../app');
const AuthService = require('../services/authService');
const ExportService = require('../services/exportService');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-export';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

describe('export workflow', () => {
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
      .send({ name: 'Export Business' });

    businessId = business.body.data.business.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('exports business data as json and csv', async () => {
    const jsonResponse = await request(app)
      .get(`/api/businesses/${businessId}/export?format=json`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.body.success).toBe(true);
    expect(jsonResponse.body.data).toContain('business');

    const csvResponse = await request(app)
      .get(`/api/businesses/${businessId}/export?format=csv`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.text).toContain('type,id');
  });

  test('deletes exportable business data', async () => {
    const deleteResponse = await request(app)
      .delete(`/api/businesses/${businessId}/export`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const exported = await ExportService.exportBusinessData(businessId);
    expect(exported).toContain('business');
  });
});
