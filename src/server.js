const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const sequelize = require('./config/db');
const AuthService = require('./services/authService');
const observability = require('./observability');

observability.installProcessHandlers();

const PORT = config.app.port;

const startServer = async () => {
  config.validateProductionConfiguration();
  await sequelize.authenticate();
  await AuthService.seedDefaultPlatformAdmin();

  const server = app.listen(PORT, () => {
    logger.info('server.started', { port: PORT, environment: config.app.nodeEnv });
  });

  return server;
};

let server;

let shuttingDown = false;

async function shutdown(signal) {
  logger.info('server.shutdown.started', { signal });
  if (server) {
    const closed = new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    // Keep-alive sockets would otherwise hold close() open until they time out.
    server.closeIdleConnections();
    await closed;
  }
  await sequelize.close();
  logger.info('server.shutdown.completed');
}

// Graceful shutdown, with a hard deadline so a stuck request can't block a deploy forever.
function handleSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  const deadline = setTimeout(() => {
    logger.error('server.shutdown.timeout', { signal, timeoutMs: config.app.shutdownTimeoutMs });
    process.exit(1);
  }, config.app.shutdownTimeoutMs);
  deadline.unref();

  shutdown(signal).then(() => process.exit(0)).catch((error) => {
    logger.error('Graceful shutdown failed', error);
    process.exit(1);
  });
}

process.on('SIGTERM', () => handleSignal('SIGTERM'));
process.on('SIGINT', () => handleSignal('SIGINT'));

startServer()
  .then((runningServer) => {
    server = runningServer;
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
