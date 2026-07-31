const logger = require('../utils/logger');

const buildRequestContext = (req) => ({
  method: req.method,
  path: req.path,
  requestId: req.headers['x-request-id'] || req.id,
  businessId: req.businessId || req.user?.businessId || null,
  userId: req.user?.sub || null,
  isPlatformAdmin: Boolean(req.isPlatformAdmin),
});

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const requestContext = buildRequestContext(req);
  logger.error('Unhandled application error', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    ...requestContext,
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // Not found errors
  if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = err.message;
  }

  // Unauthorized errors
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: requestContext.requestId,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    requestId: req.headers['x-request-id'] || req.id,
    businessId: req.businessId || req.user?.businessId || null,
  });

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
