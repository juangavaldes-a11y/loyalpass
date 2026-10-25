// Structured JSON logger (pino) writing one JSON object per line to stdout.
// Every field passes through the redactor before it reaches the output.

const pino = require('pino');
const { createRedactor, serializeError } = require('./redact');
const { getContext } = require('./context');

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
const RESERVED_FIELDS = ['msg', 'level', 'time'];

function toFields(redactor, dataOrError, context) {
  const fields = {};

  if (context && typeof context === 'object') {
    Object.assign(fields, redactor(context));
  }

  if (dataOrError instanceof Error) {
    fields.err = serializeError(dataOrError);
  } else if (dataOrError && typeof dataOrError === 'object') {
    Object.assign(fields, redactor(dataOrError));
  } else if (dataOrError !== undefined) {
    fields.detail = dataOrError;
  }

  // Keep user data from clobbering pino's own keys.
  RESERVED_FIELDS.forEach((key) => {
    if (key in fields) {
      fields[`field_${key}`] = fields[key];
      delete fields[key];
    }
  });

  return fields;
}

function wrap(instance, redactor) {
  const logger = { raw: instance };

  LEVELS.forEach((level) => {
    // Signature: (message, dataOrError?, context?). An Error may also be passed as the message.
    logger[level] = (message, dataOrError, context) => {
      if (message instanceof Error) {
        instance[level](toFields(redactor, message, dataOrError), message.message);
        return;
      }
      instance[level](toFields(redactor, dataOrError, context), String(message));
    };
  });

  logger.child = (bindings) => wrap(instance.child(redactor(bindings)), redactor);
  logger.isLevelEnabled = (level) => instance.isLevelEnabled(level);
  return logger;
}

function createLogger({
  service,
  environment = 'development',
  release,
  level = 'info',
  redactKeys = [],
  destination,
  transport,
} = {}) {
  const redactor = createRedactor(redactKeys);

  const options = {
    level,
    base: { service, env: environment, ...(release ? { release } : {}) },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin: () => getContext(),
    // Errors are already serialized by us; pino's default `err` serializer would re-process them.
    serializers: { err: (serialized) => serialized },
  };

  if (transport) {
    options.transport = transport;
    return wrap(pino(options), redactor);
  }

  options.formatters = { level: (label) => ({ level: label }) };
  return wrap(pino(options, destination), redactor);
}

module.exports = { createLogger, LEVELS };
