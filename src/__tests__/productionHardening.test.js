const request = require('supertest');

const originalEnv = process.env;

const STRONG_PRODUCTION_ENV = {
  NODE_ENV: 'production',
  DB_DIALECT: 'sqlite',
  DB_STORAGE: ':memory:',
  AUTH_SESSION_SECRET: 'a'.repeat(40),
  PLATFORM_ADMIN_EMAIL: 'owner@example.com',
  PLATFORM_ADMIN_PASSWORD: 'correct-horse-battery',
  DB_PASSWORD: 'a-real-database-password',
};

function loadWithEnv(overrides, loader) {
  jest.resetModules();
  process.env = { ...originalEnv, ...overrides };
  return loader();
}

afterAll(() => {
  process.env = originalEnv;
});

describe('production configuration validation', () => {
  const validate = (overrides) => loadWithEnv(overrides, () => require('../config/env').validateProductionConfiguration());

  test('accepts a strong configuration', () => {
    expect(() => validate(STRONG_PRODUCTION_ENV)).not.toThrow();
  });

  test.each([
    ['AUTH_SESSION_SECRET', { AUTH_SESSION_SECRET: 'too-short' }],
    ['AUTH_SESSION_SECRET', { AUTH_SESSION_SECRET: '' }],
    ['PLATFORM_ADMIN_PASSWORD', { PLATFORM_ADMIN_PASSWORD: 'admin123' }],
    ['PLATFORM_ADMIN_PASSWORD', { PLATFORM_ADMIN_PASSWORD: 'change-me-in-production' }],
    ['PLATFORM_ADMIN_PASSWORD', { PLATFORM_ADMIN_PASSWORD: 'short' }],
    ['PLATFORM_ADMIN_EMAIL', { PLATFORM_ADMIN_EMAIL: 'admin@loyalpass.local' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: 'https://app.example.com,*' }],
  ])('rejects a weak %s', (key, overrides) => {
    expect(() => validate({ ...STRONG_PRODUCTION_ENV, ...overrides })).toThrow(new RegExp(key));
  });

  test('rejects the default database password only for postgres', () => {
    expect(() => validate({ ...STRONG_PRODUCTION_ENV, DB_DIALECT: 'postgres', DB_PASSWORD: 'postgres' })).toThrow(/DB_PASSWORD/);
    expect(() => validate({ ...STRONG_PRODUCTION_ENV, DB_DIALECT: 'sqlite', DB_PASSWORD: 'postgres' })).not.toThrow();
  });

  test('reports every problem at once', () => {
    expect(() => validate({
      ...STRONG_PRODUCTION_ENV, AUTH_SESSION_SECRET: 'x', PLATFORM_ADMIN_PASSWORD: 'admin',
    })).toThrow(/AUTH_SESSION_SECRET[\s\S]*PLATFORM_ADMIN_PASSWORD/);
  });

  test('does nothing outside production', () => {
    expect(() => validate({ NODE_ENV: 'development', AUTH_SESSION_SECRET: '' })).not.toThrow();
  });
});

describe('proxy and body settings', () => {
  const parse = (value) => loadWithEnv({ NODE_ENV: 'test', TRUST_PROXY: value }, () => require('../config/env').app.trustProxy);

  test('trust proxy defaults to off and parses hops, booleans and names', () => {
    expect(parse('')).toBe(false);
    expect(parse('false')).toBe(false);
    expect(parse('1')).toBe(1);
    expect(parse('true')).toBe(true);
    expect(parse('loopback')).toBe('loopback');
  });
});

describe('HTTP hardening', () => {
  let sequelize;

  async function loadApp(overrides) {
    const app = loadWithEnv({ ...STRONG_PRODUCTION_ENV, NODE_ENV: 'test', ...overrides }, () => require('../app'));
    sequelize = require('../config/db');
    return app;
  }

  afterEach(async () => {
    if (sequelize) await sequelize.close();
    sequelize = null;
  });

  test('rejects bodies over BODY_LIMIT with 413', async () => {
    const app = await loadApp({ BODY_LIMIT: '1kb' });
    const response = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(5000) });

    expect(response.status).toBe(413);
  });

  test('applies the trust proxy setting to the app', async () => {
    expect((await loadApp({})).get('trust proxy')).toBe(false);
    await sequelize.close();
    expect((await loadApp({ TRUST_PROXY: '1' })).get('trust proxy')).toBe(1);
  });

  test('blocks disallowed CORS origins with 403 in production, not 500', async () => {
    const app = await loadApp({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.com' });

    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(blocked.status).toBe(403);

    const allowed = await request(app).get('/health').set('Origin', 'https://app.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });
});

describe('audit log tenant isolation', () => {
  test('a non-admin session without a tenant is denied instead of seeing every tenant', async () => {
    const AuditService = loadWithEnv({ NODE_ENV: 'test', DB_DIALECT: 'sqlite', DB_STORAGE: ':memory:' }, () => require('../services/auditService'));

    await expect(AuditService.listAuditLogs({ user: { isPlatformAdmin: false, businessId: '' } }))
      .rejects.toThrow(/Forbidden/);
    await expect(AuditService.listAuditLogs({ user: {} })).rejects.toThrow(/Forbidden/);
  });
});
