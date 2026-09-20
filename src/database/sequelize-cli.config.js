const config = require('../config/env');

const databaseConfig = {
  dialect: config.db.dialect,
  host: config.db.host,
  port: Number(config.db.port),
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  logging: false,
  ...(config.db.dialect === 'sqlite' ? { storage: config.db.storage } : {}),
};

module.exports = {
  development: databaseConfig,
  test: databaseConfig,
  production: databaseConfig,
};