const { EventEmitter } = require('events');
const { mapBusinessUpdates, mapCustomerUpdates } = require('../utils/fieldMapping');
const { applePassTemplate, googlePassTemplate } = require('../utils/passTemplates');
const { sendSuccess, sendError } = require('../utils/httpResponses');
const { assertPlatformAdmin, assertBusinessAccess } = require('../utils/tenantAccess');
const { getPlanModules, MODULE_CATALOG } = require('../config/moduleCatalog');
const appLogger = require('../utils/logger');

const { runWithContext, getContext, bindContext } = require('../lib/observability/context');
const { createErrorReporter, createNoopReporter } = require('../lib/observability/errorReporting');
const { redact, createRedactor, serializeError, isSensitiveKey } = require('../lib/observability/redact');
const { createRequestLogger } = require('../lib/observability/requestLogger');
const { installProcessHandlers } = require('../lib/observability/processHandlers');
const { createLogger } = require('../lib/observability/logger');
const { createObservability, optionsFromEnv } = require('../lib/observability');

describe('fieldMapping', () => {
  test('maps camelCase and snake_case business updates', () => {
    const camel = mapBusinessUpdates({
      name: 'n', logoUrl: 'l', brandColor: 'b', textColor: 't', plan: 'growth', onboardingStatus: 'o',
      trialEndsAt: 'te', subscriptionStatus: 's', subscriptionRenewsAt: 'sr', billingEmail: 'e', quotaOverrides: { a: 1 },
    });
    expect(camel).toEqual({
      name: 'n', logo_url: 'l', brand_color: 'b', text_color: 't', plan: 'growth', onboarding_status: 'o',
      trial_ends_at: 'te', subscription_status: 's', subscription_renews_at: 'sr', billing_email: 'e', quota_overrides: { a: 1 },
    });
    const snake = mapBusinessUpdates({
      logo_url: 'l', brand_color: 'b', text_color: 't', onboarding_status: 'o', trial_ends_at: 'te',
      subscription_status: 's', subscription_renews_at: 'sr', billing_email: 'e', quota_overrides: { a: 2 },
    });
    expect(snake.quota_overrides).toEqual({ a: 2 });
    expect(Object.keys(snake)).toHaveLength(9);
    expect(mapBusinessUpdates()).toEqual({});
  });

  test('maps customer updates and keeps explicit falsy tags/consent', () => {
    expect(mapCustomerUpdates({ name: 'n', email: 'e', tags: [], marketing_consent: false, ignored: 1 })).toEqual({
      name: 'n', email: 'e', tags: [], marketing_consent: false,
    });
    expect(mapCustomerUpdates()).toEqual({});
  });
});

describe('passTemplates', () => {
  const customer = { id: 'c1', name: 'Cust' };
  const points = { balance: 12 };

  test('apple template uses brand colours or defaults', () => {
    const branded = applePassTemplate({ name: 'Biz', brand_color: 'red', text_color: 'blue' }, customer, points, null);
    expect(branded).toMatchObject({ backgroundColor: 'red', textColor: 'blue', labelColor: 'blue' });
    expect(branded.primaryFields[0].value).toBe('12');

    const plain = applePassTemplate({ name: 'Biz' }, customer, points, null);
    expect(plain.backgroundColor).toBe('rgb(54, 180, 107)');
    expect(plain.textColor).toBe('rgb(255, 255, 255)');
  });

  test('google template uses the business logo or a placeholder', () => {
    expect(googlePassTemplate({ id: 'b', logo_url: 'https://logo' }, customer, points).heroImage.sourceUri.uri).toBe('https://logo');
    expect(googlePassTemplate({ id: 'b' }, customer, points).heroImage.sourceUri.uri).toContain('placeholder');
  });
});

describe('http, tenant and catalog helpers', () => {
  test('response helpers merge payloads', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    sendSuccess(res, 200);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });
    sendSuccess(res, 201, { data: 1 });
    expect(res.json).toHaveBeenLastCalledWith({ success: true, data: 1 });
    sendError(res, 400, 'bad');
    expect(res.json).toHaveBeenLastCalledWith({ success: false, message: 'bad' });
    sendError(res, 400, 'bad', { code: 'X' });
    expect(res.json).toHaveBeenLastCalledWith({ success: false, message: 'bad', code: 'X' });
  });

  test('tenant assertions', () => {
    expect(() => assertPlatformAdmin({ isPlatformAdmin: true })).not.toThrow();
    expect(() => assertPlatformAdmin({})).toThrow('Admin access');
    expect(() => assertPlatformAdmin()).toThrow('Admin access');
    expect(() => assertBusinessAccess({ isPlatformAdmin: true }, 'b')).not.toThrow();
    expect(() => assertBusinessAccess({ businessId: 'b' }, 'b')).not.toThrow();
    expect(() => assertBusinessAccess({ businessId: 'a' }, 'b')).toThrow('Access denied');
    expect(() => assertBusinessAccess({}, 'b')).toThrow('Access denied');
    expect(() => assertBusinessAccess(undefined, 'b')).toThrow('Access denied');
  });

  test('plan modules fall back to starter', () => {
    expect(getPlanModules('growth')).toEqual(Object.keys(MODULE_CATALOG));
    expect(getPlanModules('unknown')).toEqual(getPlanModules('starter'));
  });

  test('legacy logger helpers', () => {
    const payload = appLogger.formatLogPayload('evt', { password: 'x', ok: 1 }, { a: 1 });
    expect(payload).toMatchObject({ event: 'evt', a: 1, ok: 1, password: '[REDACTED]' });
    expect(appLogger.formatLogPayload('evt', null, null)).toEqual({ event: 'evt', timestamp: expect.any(String) });
    expect(appLogger.formatLogPayload('evt')).toHaveProperty('timestamp');
    expect(appLogger.createLogContext({ extra: 1 })).toMatchObject({ service: 'loyalpass-backend', extra: 1 });
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    expect(appLogger.createLogContext().environment).toBe('development');
    process.env.NODE_ENV = previous;
    expect(appLogger.sanitizeSensitiveData({ token: 't' })).toEqual({ token: '[REDACTED]' });
  });
});

describe('observability context', () => {
  test('returns an empty context outside a store and merges fields with resolved values', () => {
    expect(getContext()).toEqual({});
    bindContext({ ignored: true });

    runWithContext({ fields: { requestId: 'r', gone: null }, resolve: () => ({ userId: 'u', missing: undefined }) }, () => {
      bindContext({ tenant: 't' });
      expect(getContext()).toEqual({ requestId: 'r', userId: 'u', tenant: 't' });
    });
    runWithContext({ fields: { requestId: 'r' } }, () => {
      expect(getContext()).toEqual({ requestId: 'r' });
    });
  });
});

describe('observability redact', () => {
  test('redacts sensitive keys, extra keys and unsafe values', () => {
    expect(isSensitiveKey('API-Key', new Set())).toBe(true);
    expect(isSensitiveKey('custom', new Set(['custom']))).toBe(true);
    expect(isSensitiveKey('name', new Set())).toBe(false);

    const circular = { name: 'x' };
    circular.self = circular;
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: 1 } } } } } } } } };
    const redacted = redact({
      password: 'p', nested: { Authorization: 'a', keep: 1 }, list: [{ secret: 's' }, 2], fn: () => 1, sym: Symbol('s'),
      date: new Date(0), buf: Buffer.from('x'), nil: null, circular, deep,
    });
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.nested).toEqual({ Authorization: '[REDACTED]', keep: 1 });
    expect(redacted.list).toEqual([{ secret: '[REDACTED]' }, 2]);
    expect(redacted.fn).toBeUndefined();
    expect(redacted.sym).toBeUndefined();
    expect(redacted.date).toBe('1970-01-01T00:00:00.000Z');
    expect(redacted.buf).toBe('[Buffer]');
    expect(redacted.nil).toBeNull();
    expect(redacted.circular.self).toBe('[Circular]');
    expect(JSON.stringify(redacted.deep)).toContain('[MaxDepth]');

    expect(createRedactor(['Ssn'])({ ssn: '1', ok: 2 })).toEqual({ ssn: '[REDACTED]', ok: 2 });
    expect(createRedactor()({ ok: 1 })).toEqual({ ok: 1 });
    expect(redact({ shared: 1 })).toEqual({ shared: 1 });
  });

  test('serializes errors with code, status and nested causes', () => {
    const root = new Error('root');
    const error = Object.assign(new Error('top', { cause: root }), { code: 'E1', statusCode: 500 });
    const serialized = serializeError(error);
    expect(serialized).toMatchObject({ type: 'Error', message: 'top', code: 'E1', statusCode: 500 });
    expect(serialized.cause.message).toBe('root');
    expect(serializeError(new Error('x', { cause: 'str' })).cause).toBe('str');
    expect(serializeError({ message: 'plain' }).type).toBe('Error');
    expect(redact(error).message).toBe('top');

    let chain = new Error('deepest');
    for (let i = 0; i < 5; i += 1) chain = new Error(`l${i}`, { cause: chain });
    expect(JSON.stringify(serializeError(chain))).not.toContain('deepest');
  });
});

describe('observability error reporting', () => {
  test('noop reporter and missing DSN', async () => {
    const noop = createNoopReporter();
    expect(noop.captureException()).toBeUndefined();
    await expect(noop.flush()).resolves.toBe(true);
    expect(createErrorReporter().enabled).toBe(false);
  });

  test('falls back to noop when @sentry/node is unavailable', () => {
    const logger = { warn: jest.fn() };
    expect(createErrorReporter({ dsn: 'https://dsn', logger }).enabled).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('error_reporting.disabled', expect.any(Object));
    expect(createErrorReporter({ dsn: 'https://dsn' }).enabled).toBe(false);
  });

  test('initialises an injected Sentry, scrubs events and tags captured exceptions', () => {
    const sentry = { init: jest.fn(), captureException: jest.fn(), flush: jest.fn().mockResolvedValue(true) };
    const reporter = createErrorReporter({ dsn: 'https://dsn', service: 'svc', sentry, redactKeys: ['custom'] });
    expect(reporter.enabled).toBe(true);

    const { beforeSend } = sentry.init.mock.calls[0][0];
    expect(beforeSend({ request: { cookie: 'c' }, extra: { custom: 'x' }, other: 1 })).toEqual({
      request: { cookie: '[REDACTED]' }, extra: { custom: '[REDACTED]' }, other: 1,
    });
    expect(beforeSend({ other: 1 })).toEqual({ other: 1 });

    reporter.captureException(new Error('x'), { password: 'p' });
    expect(sentry.captureException.mock.calls[0][1]).toEqual({ extra: { password: '[REDACTED]' }, tags: {} });

    runWithContext({ fields: { requestId: 'r1', businessId: 7 } }, () => reporter.captureException(new Error('y')));
    expect(sentry.captureException.mock.calls[1][1].tags).toEqual({ requestId: 'r1', businessId: '7' });

    reporter.flush();
    expect(sentry.flush).toHaveBeenCalledWith(2000);
    reporter.flush(10);
    expect(sentry.flush).toHaveBeenLastCalledWith(10);
  });
});

describe('observability request logger', () => {
  function build(options = {}) {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const middleware = createRequestLogger({ logger, ...options });
    return { logger, middleware };
  }

  function run(middleware, { headers = {}, url = '/things?x=1', status = 200, finished = true, elapsedMs } = {}) {
    const req = { headers, originalUrl: url, method: 'GET', ip: '1.1.1.1' };
    const res = new EventEmitter();
    res.statusCode = status;
    res.writableFinished = finished;
    res.setHeader = jest.fn();
    res.getHeader = jest.fn().mockReturnValue('12');
    const next = jest.fn();
    let ctx;
    middleware(req, res, () => {
      ctx = getContext();
      next();
    });
    if (elapsedMs) {
      const real = process.hrtime.bigint;
      const start = real();
      process.hrtime.bigint = () => start + BigInt(elapsedMs * 1e6);
      res.emit('close');
      process.hrtime.bigint = real;
    } else {
      res.emit('close');
    }
    return { req, res, next, ctx };
  }

  test('requires a logger', () => {
    expect(() => createRequestLogger()).toThrow('requires a logger');
  });

  test('assigns safe request ids and rejects unsafe ones', () => {
    const { middleware } = build({ generateId: () => 'generated-id' });
    let out = run(middleware, { headers: { 'x-request-id': 'abc-12345' } });
    expect(out.req.id).toBe('abc-12345');
    expect(out.ctx.requestId).toBe('abc-12345');
    out = run(middleware, { headers: { 'x-request-id': 'bad id\n' } });
    expect(out.req.id).toBe('generated-id');
    out = run(middleware, { headers: { 'x-request-id': ['a'] } });
    expect(out.req.id).toBe('generated-id');
  });

  test('logs by status, slow requests, aborts and skips health checks', () => {
    const { logger, middleware } = build({ extractContext: () => ({ businessId: 'b' }), slowRequestMs: 50 });
    run(middleware, { headers: { 'user-agent': 'ua' } });
    expect(logger.info).toHaveBeenCalledWith('request.completed', expect.objectContaining({ businessId: 'b', userAgent: 'ua', status: 200 }));
    run(middleware, { status: 404 });
    expect(logger.warn).toHaveBeenCalledWith('request.completed', expect.objectContaining({ status: 404 }));
    run(middleware, { status: 500 });
    expect(logger.error).toHaveBeenCalledWith('request.completed', expect.objectContaining({ status: 500 }));

    logger.warn.mockClear();
    run(middleware, { elapsedMs: 100 });
    expect(logger.warn).toHaveBeenCalledWith('request.slow', expect.any(Object));
    logger.error.mockClear();
    run(middleware, { status: 500, elapsedMs: 100 });
    expect(logger.error).toHaveBeenCalledWith('request.completed', expect.any(Object));

    logger.warn.mockClear();
    run(middleware, { finished: false });
    expect(logger.warn).toHaveBeenCalledWith('request.aborted', expect.any(Object));

    logger.info.mockClear();
    run(middleware, { url: '/health' });
    expect(logger.info).not.toHaveBeenCalled();
    run(middleware, { url: '/health', status: 503 });
    expect(logger.error).toHaveBeenCalled();
  });

  test('tolerates requests without url or user agent', () => {
    const { logger, middleware } = build();
    const req = { headers: {}, method: 'GET' };
    const res = new EventEmitter();
    Object.assign(res, { statusCode: 200, writableFinished: true, setHeader: jest.fn(), getHeader: jest.fn() });
    middleware(req, res, jest.fn());
    res.emit('close');
    expect(logger.info).toHaveBeenCalledWith('request.completed', expect.objectContaining({ path: '', userAgent: undefined }));

    const alt = { headers: {}, url: '/u?x', method: 'GET' };
    const res2 = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: true, setHeader: jest.fn(), getHeader: jest.fn() });
    middleware(alt, res2, jest.fn());
    res2.emit('close');
    expect(logger.info).toHaveBeenLastCalledWith('request.completed', expect.objectContaining({ path: '/u' }));
  });
});

describe('observability process handlers', () => {
  function build(overrides = {}) {
    const proc = new EventEmitter();
    const logger = { fatal: jest.fn() };
    const reporter = { captureException: jest.fn(), flush: jest.fn().mockResolvedValue(true) };
    const exit = jest.fn();
    const uninstall = installProcessHandlers({ logger, reporter, exit, proc, flushTimeoutMs: 5, ...overrides });
    return { proc, logger, reporter, exit, uninstall };
  }

  test('logs, reports, flushes and exits once', async () => {
    const { proc, logger, reporter, exit } = build();
    proc.emit('unhandledRejection', 'plain reason');
    proc.emit('uncaughtException', new Error('second'));
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.fatal).toHaveBeenCalledTimes(1);
    expect(logger.fatal.mock.calls[0][1]).toBeInstanceOf(Error);
    expect(reporter.captureException).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('still exits when the reporter throws, and uninstall removes the listeners', async () => {
    const { proc, reporter, exit, uninstall } = build();
    reporter.captureException.mockImplementation(() => {
      throw new Error('reporter down');
    });
    const handler = proc.listeners('uncaughtException')[0];
    await expect(handler(new Error('boom'))).rejects.toThrow('reporter down');
    expect(exit).toHaveBeenCalledWith(1);
    uninstall();
    expect(proc.listenerCount('uncaughtException')).toBe(0);
    expect(proc.listenerCount('unhandledRejection')).toBe(0);
  });

  test('uses process defaults', () => {
    const before = process.listenerCount('unhandledRejection');
    const uninstall = installProcessHandlers({ logger: { fatal: jest.fn() }, reporter: createNoopReporter() });
    expect(process.listenerCount('unhandledRejection')).toBe(before + 1);
    uninstall();
    expect(process.listenerCount('unhandledRejection')).toBe(before);
  });
});

describe('observability logger', () => {
  function capture(options = {}) {
    const lines = [];
    const destination = { write: (line) => lines.push(JSON.parse(line)) };
    const logger = createLogger({ service: 'svc', level: 'trace', destination, ...options });
    return { lines, logger };
  }

  test('redacts payloads, serializes errors and protects reserved keys', () => {
    const { lines, logger } = capture({ release: '1.0', redactKeys: ['custom'] });
    logger.info('hello', { password: 'p', custom: 'c', msg: 'clobber', ok: 1 }, { level: 'ctx' });
    expect(lines[0]).toMatchObject({ service: 'svc', release: '1.0', msg: 'hello', password: '[REDACTED]', custom: '[REDACTED]', field_msg: 'clobber', ok: 1, level: 'info' });
    expect(lines[0].field_level).toBe('ctx');

    logger.error('failed', new Error('boom'), { requestId: 'r' });
    expect(lines[1].err.message).toBe('boom');
    expect(lines[1].requestId).toBe('r');

    logger.warn(new Error('as message'), { extra: 1 });
    expect(lines[2]).toMatchObject({ msg: 'as message', extra: 1 });
    expect(lines[2].err.message).toBe('as message');

    logger.debug('scalar', 'just text');
    expect(lines[3].detail).toBe('just text');
    logger.trace('bare');
    expect(lines[4].msg).toBe('bare');

    runWithContext({ fields: { requestId: 'ctx-id' } }, () => logger.fatal('in context'));
    expect(lines[5].requestId).toBe('ctx-id');
  });

  test('child loggers, level checks and default options', () => {
    const { lines, logger } = capture({ level: 'warn' });
    expect(logger.isLevelEnabled('info')).toBe(false);
    logger.child({ token: 't', scope: 's' }).warn('child');
    expect(lines[0]).toMatchObject({ scope: 's', token: '[REDACTED]' });

    const defaults = createLogger({ service: 'x', level: 'silent' });
    expect(() => defaults.info('quiet')).not.toThrow();
    const withTransport = createLogger({ service: 'x', level: 'silent', environment: 'test', transport: undefined });
    expect(withTransport.raw).toBeDefined();
  });

  test('accepts a pino transport', () => {
    const logger = createLogger({ service: 'x', level: 'silent', transport: { target: 'pino/file', options: { destination: 1 } } });
    expect(logger.raw).toBeDefined();
    logger.raw.flush?.();
  });
});

describe('createObservability', () => {
  test('reads defaults from the environment', () => {
    expect(optionsFromEnv({ NODE_ENV: 'test' })).toMatchObject({ environment: 'test', level: 'silent', tracesSampleRate: 0 });
    expect(optionsFromEnv({ LOG_LEVEL: 'debug', APP_VERSION: '2', SENTRY_DSN: 'd', SENTRY_TRACES_SAMPLE_RATE: '0.5' })).toMatchObject({
      environment: 'development', level: 'debug', release: '2', sentryDsn: 'd', tracesSampleRate: 0.5,
    });
    expect(optionsFromEnv({ GIT_SHA: 'abc' }).release).toBe('abc');
    expect(optionsFromEnv({})).toMatchObject({ level: 'info', release: undefined, sentryDsn: undefined });
  });

  test('wires logger, reporter, request logger and handlers', () => {
    expect(() => createObservability()).toThrow('service name');

    const sentry = { init: jest.fn(), captureException: jest.fn(), flush: jest.fn() };
    const obs = createObservability({ service: 'svc', level: 'silent', sentryDsn: 'dsn', sentry });
    expect(obs.reporter.enabled).toBe(true);
    obs.captureException(new Error('x'), { a: 1 });
    expect(sentry.captureException).toHaveBeenCalled();
    expect(typeof obs.requestLogger()).toBe('function');

    const proc = new EventEmitter();
    const uninstall = obs.installProcessHandlers({ proc, exit: jest.fn() });
    expect(proc.listenerCount('uncaughtException')).toBe(1);
    uninstall();
    expect(typeof obs.installProcessHandlers).toBe('function');
  });
});
