// Express middleware: assigns a request ID, binds log context, logs one line per request.

const { randomUUID } = require('crypto');
const { runWithContext } = require('./context');

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

function levelForStatus(status) {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function createRequestLogger({
  logger,
  extractContext = () => ({}),
  skipPaths = ['/health'],
  header = 'x-request-id',
  slowRequestMs = 2000,
  generateId = randomUUID,
} = {}) {
  if (!logger) {
    throw new Error('createRequestLogger requires a logger');
  }

  return function requestLogger(req, res, next) {
    // Only trust a caller-supplied ID if it can't be used for log injection.
    const incoming = req.headers[header];
    const requestId = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : generateId();
    req.id = requestId;
    res.setHeader(header, requestId);

    const startedAt = process.hrtime.bigint();
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const store = { fields: { requestId }, resolve: () => extractContext(req) };

    res.on('close', () => {
      const completed = res.writableFinished;
      const status = res.statusCode;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      if (completed && status < 400 && skipPaths.includes(path)) return;

      const fields = {
        requestId,
        ...extractContext(req),
        method: req.method,
        path,
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        contentLength: res.getHeader('content-length'),
        ip: req.ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 200) || undefined,
      };

      if (!completed) {
        logger.warn('request.aborted', fields);
      } else if (durationMs >= slowRequestMs && status < 500) {
        logger.warn('request.slow', fields);
      } else {
        logger[levelForStatus(status)]('request.completed', fields);
      }
    });

    runWithContext(store, next);
  };
}

module.exports = { createRequestLogger };
