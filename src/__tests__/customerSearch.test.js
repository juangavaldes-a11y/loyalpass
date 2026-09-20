const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'test-secret-customer-search';

const app = require('../app');
const sequelize = require('../config/db');
const { Business, Customer, PortalUser } = require('../models');
const AuthService = require('../services/authService');

describe('customer search', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('scopes a paginated search to the authenticated business', async () => {
    const business = await Business.create({ name: 'Search Business' });
    const password = 'search-password';
    const password_hash = await require('bcryptjs').hash(password, 10);
    await PortalUser.create({
      email: 'search.owner@example.com',
      password_hash,
      role: 'client_owner',
      business_id: business.id,
      active: true,
    });
    await Customer.bulkCreate([
      { business_id: business.id, name: 'Ada Lovelace', email: 'ada@example.com' },
      { business_id: business.id, name: 'Grace Hopper', email: 'grace@example.com' },
    ]);
    const login = await AuthService.authenticate('search.owner@example.com', password);

    const response = await request(app)
      .get('/api/customers?search=ada&page=1&pageSize=10')
      .set('Authorization', `Bearer ${login.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].email).toBe('ada@example.com');
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 10, total: 1 });
  });
});