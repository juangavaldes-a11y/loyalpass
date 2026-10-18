// Backwards-compatible entry point. The implementation lives in src/lib/observability.
const { redact } = require('../lib/observability');
const { logger } = require('../observability');

function formatLogPayload(event, data = {}, context = {}) {
  return {
    event,
    timestamp: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? context : {}),
    ...(data ? redact(data) : {}),
  };
}

function createLogContext(overrides = {}) {
  return {
    environment: process.env.NODE_ENV || 'development',
    service: 'loyalpass-backend',
    ...overrides,
  };
}

module.exports = logger;
module.exports.sanitizeSensitiveData = redact;
module.exports.formatLogPayload = formatLogPayload;
module.exports.createLogContext = createLogContext;
module.exports.default = logger;
module.exports.logger = logger;
