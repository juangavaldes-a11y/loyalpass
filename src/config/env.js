require('dotenv').config();
const config = require('config');

// Merge environment variables with config file settings
const nodeEnv = process.env.NODE_ENV || 'development';

const mergedConfig = {
  ...config.get('.'),
  // Allow environment variables to override config file
  db: {
    ...config.get('db'),
    host: process.env.DB_HOST || config.get('db.host'),
    port: process.env.DB_PORT || config.get('db.port'),
    database: process.env.DB_NAME || config.get('db.database'),
    username: process.env.DB_USER || config.get('db.username'),
    password: process.env.DB_PASSWORD || config.get('db.password'),
    dialect: process.env.DB_DIALECT || config.get('db.dialect'),
  },
  app: {
    ...config.get('app'),
    port: process.env.PORT || config.get('app.port'),
    nodeEnv,
  },
  apple: {
    teamId: process.env.APPLE_TEAM_ID || config.get('apple.teamId'),
    keyId: process.env.APPLE_KEY_ID || config.get('apple.keyId'),
    certificatePath: process.env.APPLE_CERTIFICATE_PATH || config.get('apple.certificatePath'),
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || config.get('google.projectId'),
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || config.get('google.serviceAccountKeyPath'),
    issuerId: process.env.GOOGLE_ISSUER_ID || config.get('google.issuerId'),
  },
  logging: {
    level: process.env.LOG_LEVEL || config.get('logging.level'),
  },
};

module.exports = mergedConfig;
