function redactValue(value) {
  return value;
}

function sanitizeSensitiveData(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (['password', 'token', 'secret', 'apiKey', 'authorization'].includes(key.toLowerCase())) {
      acc[key] = '[REDACTED]';
      return acc;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = sanitizeSensitiveData(value);
      return acc;
    }

    acc[key] = redactValue(value);
    return acc;
  }, {});
}

function formatLogPayload(event, data = {}, context = {}) {
  return {
    event,
    timestamp: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? context : {}),
    ...(data ? sanitizeSensitiveData(data) : {}),
  };
}

function createLogContext(overrides = {}) {
  return {
    environment: process.env.NODE_ENV || 'development',
    service: 'loyalpass-backend',
    ...overrides,
  };
}

function writeLog(level, message, data = {}, context = {}) {
  const payload = formatLogPayload(message, data, context);
  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] ${serialized}`);
    return;
  }

  console.log(`[${level.toUpperCase()}] ${serialized}`);
}

const logger = {
  info: (message, data, context) => {
    writeLog('info', message, data, context);
  },
  error: (message, error, context) => {
    const payload = error && typeof error === 'object' && !Array.isArray(error)
      ? { error: sanitizeSensitiveData(error) }
      : { error };
    writeLog('error', message, payload, context);
  },
  warn: (message, data, context) => {
    writeLog('warn', message, data, context);
  },
  debug: (message, data, context) => {
    if (process.env.LOG_LEVEL === 'debug') {
      writeLog('debug', message, data, context);
    }
  },
};

module.exports = logger;
module.exports.sanitizeSensitiveData = sanitizeSensitiveData;
module.exports.formatLogPayload = formatLogPayload;
module.exports.createLogContext = createLogContext;
module.exports.default = logger;
module.exports.logger = logger;
