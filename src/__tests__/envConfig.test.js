describe('environment configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_DIALECT;
    delete process.env.DB_STORAGE;
    delete process.env.DB_LOGGING;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses database credentials from the environment when provided', () => {
    process.env.DB_DIALECT = 'sqlite';
    process.env.DB_USERNAME = 'demo_user';
    process.env.DB_PASSWORD = 'demo_pass';
    process.env.DB_NAME = 'demo_db';
    process.env.DB_STORAGE = './demo.sqlite3';

    const config = require('../config/env');

    expect(config.db.dialect).toBe('sqlite');
    expect(config.db.username).toBe('demo_user');
    expect(config.db.password).toBe('demo_pass');
    expect(config.db.database).toBe('demo_db');
    expect(config.db.storage).toBe('./demo.sqlite3');
  });
});
