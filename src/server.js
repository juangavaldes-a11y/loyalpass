const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const pool = require('./config/db');

const PORT = config.app.port;

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  } else {
    logger.info('Database connected successfully');
  }
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.app.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});
