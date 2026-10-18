// Optional Sentry integration. @sentry/node is loaded lazily, so projects that
// don't install it (or don't set a DSN) get a no-op reporter.

const { createRedactor } = require('./redact');
const { getContext } = require('./context');

function createNoopReporter() {
  return {
    enabled: false,
    captureException: () => undefined,
    flush: async () => true,
  };
}

function scrubEvent(event, redactor) {
  const scrubbed = { ...event };
  if (scrubbed.request) {
    scrubbed.request = redactor(scrubbed.request);
  }
  if (scrubbed.extra) {
    scrubbed.extra = redactor(scrubbed.extra);
  }
  return scrubbed;
}

function createErrorReporter({
  dsn,
  environment,
  release,
  service,
  tracesSampleRate = 0,
  redactKeys = [],
  logger,
  sentry, // injectable for tests
} = {}) {
  if (!dsn) {
    return createNoopReporter();
  }

  let Sentry = sentry;
  if (!Sentry) {
    try {
      Sentry = require('@sentry/node');
    } catch (error) {
      if (logger) logger.warn('error_reporting.disabled', { reason: '@sentry/node is not installed' });
      return createNoopReporter();
    }
  }

  const redactor = createRedactor(redactKeys);

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    sendDefaultPii: false,
    initialScope: { tags: { service } },
    beforeSend: (event) => scrubEvent(event, redactor),
  });

  return {
    enabled: true,
    captureException(error, context = {}) {
      const { requestId, businessId } = getContext();
      Sentry.captureException(error, {
        extra: redactor(context),
        tags: { ...(requestId ? { requestId } : {}), ...(businessId ? { businessId: String(businessId) } : {}) },
      });
    },
    flush: (timeoutMs = 2000) => Sentry.flush(timeoutMs),
  };
}

module.exports = { createErrorReporter, createNoopReporter };
