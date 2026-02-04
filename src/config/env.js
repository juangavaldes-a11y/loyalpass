require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loyalpass',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  app: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  apple: {
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    certificatePath: process.env.APPLE_CERTIFICATE_PATH,
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
  },
};
