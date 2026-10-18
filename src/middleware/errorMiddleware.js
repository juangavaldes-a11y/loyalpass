const logger = require('../utils/logger');
const observability = require('../observability');

const buildRequestContext = (req) => ({
  method: req.method,
  path: req.path,
  requestId: req.id || req.headers['x-request-id'],
  businessId: req.businessId || req.user?.businessId || null,
  userId: req.user?.sub || null,
  isPlatformAdmin: Boolean(req.isPlatformAdmin),
});

const resolveStatusCode = (err) => {
  if (err.name === 'ValidationError') return 400;
  if (err.name === 'NotFoundError') return 404;
  if (err.name === 'UnauthorizedError') return 401;
  return err.statusCode || 500;
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const requestContext = buildRequestContext(req);
  const statusCode = resolveStatusCode(err);

  // Client errors are expected traffic; only server faults are errors worth paging on.
  if (statusCode >= 500) {
    logger.error('Unhandled application error', err, requestContext);
    observability.captureException(err, requestContext);
  } else {
    logger.warn('Request rejected', { ...requestContext, statusCode, message: err.message });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
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
