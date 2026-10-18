// Reusable observability module: structured logging, request tracing, error reporting.
// Self-contained (depends only on `pino`; `@sentry/node` is optional). Copy this folder
// into another project and call createObservability(). See README.md.

const { createLogger } = require('./logger');
const { createRequestLogger } = require('./requestLogger');
const { createErrorReporter } = require('./errorReporting');
const { installProcessHandlers } = require('./processHandlers');
const { runWithContext, getContext, bindContext } = require('./context');
const { createRedactor, redact, serializeError } = require('./redact');

// Reads the standard env vars so every project configures observability the same way.
function optionsFromEnv(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  return {
    environment: env.NODE_ENV || 'development',
    level: env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
    release: env.APP_VERSION || env.GIT_SHA || undefined,
    sentryDsn: env.SENTRY_DSN || undefined,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE || 0),
  };
}

function createObservability(options = {}) {
  const {
    service,
    environment,
    release,
    level,
    redactKeys,
    destination,
    transport,
    sentryDsn,
    tracesSampleRate,
    sentry,
    extractContext,
    skipPaths,
    slowRequestMs,
  } = { ...optionsFromEnv(), ...options };

  if (!service) {
    throw new Error('createObservability requires a service name');
  }

  const logger = createLogger({ service, environment, release, level, redactKeys, destination, transport });
  const reporter = createErrorReporter({
    dsn: sentryDsn, environment, release, service, tracesSampleRate, redactKeys, logger, sentry,
  });

  return {
    logger,
    reporter,
    requestLogger: () => createRequestLogger({ logger, extractContext, skipPaths, slowRequestMs }),
    installProcessHandlers: (handlerOptions = {}) => installProcessHandlers({ logger, reporter, ...handlerOptions }),
    captureException: (error, context) => reporter.captureException(error, context),
  };
}

module.exports = {
  createObservability,
  optionsFromEnv,
  getContext,
  bindContext,
  runWithContext,
  createRedactor,
  redact,
  serializeError,
};
