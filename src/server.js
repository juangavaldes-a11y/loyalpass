const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const sequelize = require('./config/db');
const AuthService = require('./services/authService');

const PORT = config.app.port;

const startServer = async () => {
  config.validateProductionConfiguration();
  await sequelize.authenticate();
  await AuthService.seedDefaultPlatformAdmin();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${config.app.nodeEnv}`);
  });

  return server;
};

let server;

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await sequelize.close();
  logger.info('Server and database connection closed');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  shutdown('SIGTERM').then(() => process.exit(0)).catch((error) => {
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').then(() => process.exit(0)).catch((error) => {
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  });
});

startServer()
  .then((runningServer) => {
    server = runningServer;
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
