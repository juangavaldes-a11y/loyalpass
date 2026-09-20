const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-api-key-security';

const app = require('../app');
const sequelize = require('../config/db');
const { ApiKey, Business, PortalUser } = require('../models');
const AuthService = require('../services/authService');

describe('API key security', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('stores only an API key digest and accepts a client bearer token', async () => {
    const business = await Business.create({ name: 'Secure Key Business' });
    const { key } = await ApiKey.issue(business.id);
    const storedKey = await ApiKey.findOne({ where: { business_id: business.id } });
    expect(storedKey.key_hash).toBe(ApiKey.hash(key));
    expect(storedKey.key_hash).not.toBe(key);
    expect(storedKey.key_prefix).toBe(key.slice(0, 12));

    const password = 'secure-password';
    const password_hash = await require('bcryptjs').hash(password, 10);
    await PortalUser.create({
      email: 'owner@secure.example',
      password_hash,
      role: 'client_owner',
      business_id: business.id,
      active: true,
    });
    const login = await AuthService.authenticate('owner@secure.example', password);
    const response = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${login.accessToken}`);

    expect(response.status).toBe(200);
  });
});