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

function parseTrustProxy(value) {
  const normalized = String(value).trim();
  if (normalized === '' || normalized.toLowerCase() === 'false') return false;
  if (normalized.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return normalized;
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
    corsOrigins: getEnvOrDefault('CORS_ORIGINS', '').split(',').map((origin) => origin.trim()).filter(Boolean),
    // Express "trust proxy": number of proxy hops, 'loopback', a CIDR list, or false (default, safe).
    trustProxy: parseTrustProxy(getEnvOrDefault('TRUST_PROXY', '')),
    bodyLimit: getEnvOrDefault('BODY_LIMIT', '100kb'),
    shutdownTimeoutMs: Number(getEnvOrDefault('SHUTDOWN_TIMEOUT_MS', 10000)),
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
  smtp: {
    host: getEnvOrDefault('SMTP_HOST', ''),
    port: Number(getEnvOrDefault('SMTP_PORT', 587)),
    secure: getEnvOrDefault('SMTP_SECURE', 'false') === 'true',
    user: getEnvOrDefault('SMTP_USER', ''),
    password: getSecretValue('SMTP_PASSWORD', ''),
    from: getEnvOrDefault('SMTP_FROM', ''),
  },
  secrets: {
    authSessionSecret: getSecretValue('AUTH_SESSION_SECRET', getConfigValue('secrets', 'authSessionSecret', '')),
    platformAdminEmail: getEnvOrDefault('PLATFORM_ADMIN_EMAIL', getConfigValue('secrets', 'platformAdminEmail', 'admin@loyalpass.local')),
    platformAdminPassword: getSecretValue('PLATFORM_ADMIN_PASSWORD', getConfigValue('secrets', 'platformAdminPassword', 'admin123')),
    webhookSecret: getSecretValue('WEBHOOK_SECRET', getConfigValue('secrets', 'webhookSecret', '')),
  },
};

const WEAK_VALUES = new Set([
  'admin', 'admin123', 'password', 'postgres', 'changeme', 'change-me', 'change-me-in-production',
  'your_secure_password', 'secret', 'test',
]);
const DEFAULT_ADMIN_EMAIL = 'admin@loyalpass.local';
const MIN_SESSION_SECRET_LENGTH = 32;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

function isWeak(value) {
  return !value || WEAK_VALUES.has(String(value).trim().toLowerCase());
}

function validateProductionConfiguration() {
  if (nodeEnv !== 'production') {
    return;
  }

  const { authSessionSecret, platformAdminEmail, platformAdminPassword } = mergedConfig.secrets;
  const problems = [];

  if (isWeak(authSessionSecret) || authSessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    problems.push(`AUTH_SESSION_SECRET must be set to a random value of at least ${MIN_SESSION_SECRET_LENGTH} characters`);
  }
  if (!platformAdminEmail || platformAdminEmail === DEFAULT_ADMIN_EMAIL) {
    problems.push('PLATFORM_ADMIN_EMAIL must be set to a real address (not the seeded default)');
  }
  if (isWeak(platformAdminPassword) || platformAdminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    problems.push(`PLATFORM_ADMIN_PASSWORD must not be a default and must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
  }
  if (mergedConfig.db.dialect === 'postgres' && isWeak(mergedConfig.db.password)) {
    problems.push('DB_PASSWORD must be set and must not be a default value');
  }
  if (mergedConfig.app.corsOrigins.includes('*')) {
    problems.push('CORS_ORIGINS must list explicit origins, not "*"');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
  }
}

mergedConfig.validateProductionConfiguration = validateProductionConfiguration;

module.exports = mergedConfig;
