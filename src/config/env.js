require('dotenv').config();
const config = require('config');

function getEnvOrDefault(key, fallback) {
  const value = process.env[key];
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return fallback;
}

function getSecretValue(key, fallback) {
  const value = getEnvOrDefault(key, fallback);
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return fallback;
}

function getConfigValue(section, key, fallback) {
  if (config.has(section)) {
    const sectionConfig = config.get(section);
    if (sectionConfig && Object.prototype.hasOwnProperty.call(sectionConfig, key)) {
      return sectionConfig[key];
    }
  }
  return fallback;
}

// Merge environment variables with config file settings
const nodeEnv = process.env.NODE_ENV || 'development';
const baseDbConfig = config.has('db') ? config.get('db') : {};
const baseAppConfig = config.has('app') ? config.get('app') : {};
const baseAppleConfig = config.has('apple') ? config.get('apple') : {};
const baseGoogleConfig = config.has('google') ? config.get('google') : {};
const baseLoggingConfig = config.has('logging') ? config.get('logging') : {};

const mergedConfig = {
  // Allow environment variables to override config file
  db: {
    ...baseDbConfig,
    host: getEnvOrDefault('DB_HOST', getConfigValue('db', 'host', 'localhost')),
    port: getEnvOrDefault('DB_PORT', getConfigValue('db', 'port', 5432)),
    database: getEnvOrDefault('DB_NAME', getConfigValue('db', 'database', 'loyalpass')),
    username: getEnvOrDefault('DB_USERNAME', getEnvOrDefault('DB_USER', getConfigValue('db', 'username', 'postgres'))),
    password: getSecretValue('DB_PASSWORD', getSecretValue('DB_PASS', getConfigValue('db', 'password', 'postgres'))),
    dialect: getEnvOrDefault('DB_DIALECT', getConfigValue('db', 'dialect', 'sqlite')),
    storage: getEnvOrDefault('DB_STORAGE', getConfigValue('db', 'storage', './dev.sqlite3')),
    logging: getEnvOrDefault('DB_LOGGING', getConfigValue('db', 'logging', false)),
  },
  app: {
    ...baseAppConfig,
    port: getEnvOrDefault('PORT', getConfigValue('app', 'port', 3000)),
    nodeEnv,
  },
  apple: {
    ...baseAppleConfig,
    teamId: getSecretValue('APPLE_TEAM_ID', getConfigValue('apple', 'teamId', '')),
    keyId: getSecretValue('APPLE_KEY_ID', getConfigValue('apple', 'keyId', '')),
    certificatePath: getSecretValue('APPLE_CERTIFICATE_PATH', getConfigValue('apple', 'certificatePath', '')),
  },
  google: {
    ...baseGoogleConfig,
    projectId: getSecretValue('GOOGLE_PROJECT_ID', getConfigValue('google', 'projectId', '')),
    serviceAccountKeyPath: getSecretValue('GOOGLE_SERVICE_ACCOUNT_PATH', getConfigValue('google', 'serviceAccountKeyPath', '')),
    issuerId: getSecretValue('GOOGLE_ISSUER_ID', getConfigValue('google', 'issuerId', '')),
  },
  logging: {
    ...baseLoggingConfig,
    level: getEnvOrDefault('LOG_LEVEL', getConfigValue('logging', 'level', 'info')),
  },
  secrets: {
    authSessionSecret: getSecretValue('AUTH_SESSION_SECRET', getConfigValue('secrets', 'authSessionSecret', '')),
    platformAdminEmail: getEnvOrDefault('PLATFORM_ADMIN_EMAIL', getConfigValue('secrets', 'platformAdminEmail', 'admin@loyalpass.local')),
    platformAdminPassword: getSecretValue('PLATFORM_ADMIN_PASSWORD', getConfigValue('secrets', 'platformAdminPassword', 'admin123')),
    webhookSecret: getSecretValue('WEBHOOK_SECRET', getConfigValue('secrets', 'webhookSecret', '')),
  },
};

module.exports = mergedConfig;
