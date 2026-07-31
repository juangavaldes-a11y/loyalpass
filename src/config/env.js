require('dotenv').config();
const config = require('config');

// Merge environment variables with config file settings
const nodeEnv = process.env.NODE_ENV || 'development';
const baseDbConfig = config.get('db');
const baseAppConfig = config.get('app');
const baseAppleConfig = config.has('apple') ? config.get('apple') : {};
const baseGoogleConfig = config.has('google') ? config.get('google') : {};
const baseLoggingConfig = config.get('logging');

const mergedConfig = {
  // Allow environment variables to override config file
  db: {
    ...baseDbConfig,
    host: process.env.DB_HOST || baseDbConfig.host,
    port: process.env.DB_PORT || baseDbConfig.port,
    database: process.env.DB_NAME || baseDbConfig.database,
    username: process.env.DB_USER || baseDbConfig.username,
    password: process.env.DB_PASSWORD || baseDbConfig.password,
    dialect: process.env.DB_DIALECT || baseDbConfig.dialect,
  },
  app: {
    ...baseAppConfig,
    port: process.env.PORT || baseAppConfig.port,
    nodeEnv,
  },
  apple: {
    ...baseAppleConfig,
    teamId: process.env.APPLE_TEAM_ID || baseAppleConfig.teamId,
    keyId: process.env.APPLE_KEY_ID || baseAppleConfig.keyId,
    certificatePath: process.env.APPLE_CERTIFICATE_PATH || baseAppleConfig.certificatePath,
  },
  google: {
    ...baseGoogleConfig,
    projectId: process.env.GOOGLE_PROJECT_ID || baseGoogleConfig.projectId,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || baseGoogleConfig.serviceAccountKeyPath,
    issuerId: process.env.GOOGLE_ISSUER_ID || baseGoogleConfig.issuerId,
  },
  logging: {
    ...baseLoggingConfig,
    level: process.env.LOG_LEVEL || baseLoggingConfig.level,
  },
};

module.exports = mergedConfig;
