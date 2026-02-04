const { Sequelize } = require('sequelize');
const config = require('./env');
const logger = require('../utils/logger');

let sequelize;

if (config.db.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.db.storage || './dev.sqlite3',
    logging: config.db.logging ? console.log : false,
  });
} else if (config.db.dialect === 'postgres') {
  sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    {
      host: config.db.host,
      port: config.db.port,
      dialect: 'postgres',
      logging: config.db.logging ? console.log : false,
      pool: config.db.pool || {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

// Test connection
sequelize
  .authenticate()
  .then(() => {
    logger.info(`Database connected successfully (${config.db.dialect})`);
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
  });

module.exports = sequelize;
