const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sequelize = require('../config/db');
const app = require('../app');
const AuthService = require('../services/authService');
const BusinessService = require('../services/businessService');
const SupportService = require('../services/supportService');
const BackupService = require('../services/backupService');
const { errorHandler, notFoundHandler } = require('../middleware/errorMiddleware');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-business-coverage';
process.env.PLATFORM_ADMIN_EMAIL = 'admin@loyalpass.local';
process.env.PLATFORM_ADMIN_PASSWORD = 'admin123';

describe('business lifecycle and middleware coverage', () => {
  let adminToken;
  let businessId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await AuthService.seedDefaultPlatformAdmin();

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@loyalpass.local',
      password: 'admin123',
    });
    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('business service covers create, read, update, quota, and key flows', async () => {
    const created = await BusinessService.createBusiness('Coverage Co', 'https://img.test/logo.png', '#112233', '#ffffff');
    expect(created.business.name).toBe('Coverage Co');
    businessId = created.business.id;

    const fetched = await BusinessService.getBusiness(businessId);
    expect(fetched.id).toBe(businessId);

    const updated = await BusinessService.updateBusiness(businessId, { name: 'Coverage Co Updated' });
    expect(updated.name).toBe('Coverage Co Updated');

    const onboarding = await BusinessService.updateOnboarding(businessId, { onboarding_status: 'completed', plan: 'growth' });
    expect(onboarding.plan).toBe('growth');
    expect(onboarding.onboarding_status).toBe('completed');

    const billing = await BusinessService.updateBilling(businessId, { subscription_status: 'active' });
    expect(billing.subscription_status).toBe('active');

    const quotaStatus = await BusinessService.getQuotaStatus(businessId, { customers: 50 });
    expect(quotaStatus.plan).toBe('growth');
    expect(quotaStatus.quotas).toBeDefined();
    expect(quotaStatus.checks.customers).toBeDefined();

    const apiKey = await BusinessService.createApiKey(businessId);
    expect(apiKey).toBeDefined();

    const rotated = await BusinessService.rotateApiKey(businessId);
    expect(rotated).toBeDefined();

    const listed = await BusinessService.listBusinesses();
    expect(listed.length).toBeGreaterThan(0);

    const support = await SupportService.getSupportPolicy(businessId);
    expect(support.plan).toBe('growth');
  });

  test('business controller exposes backup, restore, export, delete, and support endpoints', async () => {
    const createResponse = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Controller Business' });
    expect(createResponse.status).toBe(201);

    const createdBusinessId = createResponse.body.data.business.id;

    const getResponse = await request(app)
      .get(`/api/businesses/${createdBusinessId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getResponse.status).toBe(200);

    const updateResponse = await request(app)
      .put(`/api/businesses/${createdBusinessId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Controller Business Updated' });
    expect(updateResponse.status).toBe(200);

    const supportResponse = await request(app)
      .get(`/api/businesses/${createdBusinessId}/support`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(supportResponse.status).toBe(200);

    const exportJsonResponse = await request(app)
      .get(`/api/businesses/${createdBusinessId}/export?format=json`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exportJsonResponse.status).toBe(200);

    const exportCsvResponse = await request(app)
      .get(`/api/businesses/${createdBusinessId}/export?format=csv`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exportCsvResponse.status).toBe(200);
    expect(exportCsvResponse.text).toContain('type');

    const backupResponse = await request(app)
      .post(`/api/businesses/${createdBusinessId}/backup`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(backupResponse.status).toBe(200);

    const backupFilePath = backupResponse.body.data.filePath;
    expect(fs.existsSync(backupFilePath)).toBe(true);

    const restoreResponse = await request(app)
      .post(`/api/businesses/${createdBusinessId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ inputPath: backupFilePath });
    expect(restoreResponse.status).toBe(200);

    const deleteResponse = await request(app)
      .delete(`/api/businesses/${createdBusinessId}/export`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResponse.status).toBe(200);
  });

  test('error middleware formats application and not-found errors', () => {
    const req = { method: 'GET', path: '/missing', headers: { 'x-request-id': 'req-123' }, businessId: 'biz-1' };
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

    errorHandler(new Error('Boom'), req, res, jest.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Boom');

    const notFoundRes = {
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

    notFoundHandler(req, notFoundRes);
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
  });
});
