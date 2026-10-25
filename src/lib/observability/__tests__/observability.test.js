const express = require('express');
const request = require('supertest');
const {
  createObservability, redact, serializeError, getContext,
} = require('..');

function capture() {
  const lines = [];
  return {
    lines,
    destination: { write: (chunk) => lines.push(JSON.parse(chunk)) },
  };
}

function build(options = {}) {
  const sink = capture();
  const obs = createObservability({
    service: 'test-svc', level: 'debug', destination: sink.destination, ...options,
  });
  return { obs, lines: sink.lines };
}

describe('redact', () => {
  test('redacts sensitive keys case-insensitively, including nested objects and arrays', () => {
    const result = redact({
      apiKey: 'a',
      'X-API-Key': 'b',
      headers: { Authorization: 'Bearer x', accept: 'json' },
      list: [{ refresh_token: 'r', ok: 1 }],
    });

    expect(result).toEqual({
      apiKey: '[REDACTED]',
      'X-API-Key': '[REDACTED]',
      headers: { Authorization: '[REDACTED]', accept: 'json' },
      list: [{ refresh_token: '[REDACTED]', ok: 1 }],
    });
  });

  test('handles circular references', () => {
    const a = { name: 'a' };
    a.self = a;
    expect(redact(a)).toEqual({ name: 'a', self: '[Circular]' });
  });

  test('serializes errors, which have no enumerable properties', () => {
    const error = new Error('boom', { cause: new Error('root') });
    const result = serializeError(error);

    expect(result).toEqual(expect.objectContaining({ type: 'Error', message: 'boom' }));
    expect(result.cause.message).toBe('root');
    expect(result.stack).toContain('boom');
  });
});

describe('logger', () => {
  test('emits one JSON object per line with level label, service and ISO time', () => {
    const { obs, lines } = build({ release: '1.2.3' });
    obs.logger.info('hello', { a: 1 });

    expect(lines[0]).toEqual(expect.objectContaining({
      level: 'info', msg: 'hello', a: 1, service: 'test-svc', env: expect.any(String), release: '1.2.3',
    }));
    expect(new Date(lines[0].time).toISOString()).toBe(lines[0].time);
  });

  test('logs the message and stack when given an Error', () => {
    const { obs, lines } = build();
    obs.logger.error('failed', new Error('db down'), { requestId: 'r1' });

    expect(lines[0].err).toEqual(expect.objectContaining({ type: 'Error', message: 'db down' }));
    expect(lines[0].requestId).toBe('r1');
  });

  test('redacts secrets, honours extra redactKeys and protects reserved keys', () => {
    const { obs, lines } = build({ redactKeys: ['ssn'] });
    obs.logger.info('x', { password: 'p', ssn: '123', msg: 'spoof', level: 'fatal' });

    expect(lines[0]).toEqual(expect.objectContaining({
      password: '[REDACTED]', ssn: '[REDACTED]', msg: 'x', level: 'info', field_msg: 'spoof', field_level: 'fatal',
    }));
  });

  test('child loggers add bindings', () => {
    const { obs, lines } = build();
    obs.logger.child({ job: 'backup' }).info('run');

    expect(lines[0].job).toBe('backup');
  });

  test('respects the level threshold', () => {
    const { obs, lines } = build({ level: 'warn' });
    obs.logger.info('hidden');
    obs.logger.warn('shown');

    expect(lines.map((l) => l.msg)).toEqual(['shown']);
  });
});

describe('request logging', () => {
  function makeApp(obs) {
    const app = express();
    app.use(obs.requestLogger());
    app.use(express.json());
    app.use((req, res, next) => {
      req.businessId = 'biz-1';
      next();
    });
    app.get('/health', (req, res) => res.json({ ok: true }));
    app.post('/things', async (req, res) => {
      await new Promise((resolve) => setImmediate(resolve));
      obs.logger.info('inside handler');
      res.status(201).json({ id: getContext().requestId });
    });
    app.get('/boom', (req, res) => res.status(500).json({}));
    return app;
  }

  const options = { extractContext: (req) => ({ businessId: req.businessId }) };

  test('propagates request ID and tenant to logs emitted in handlers, after body parsing and awaits', async () => {
    const { obs, lines } = build(options);
    const res = await request(makeApp(obs)).post('/things?token=secret').send({ a: 1 });

    expect(res.status).toBe(201);
    const inner = lines.find((l) => l.msg === 'inside handler');
    expect(inner).toEqual(expect.objectContaining({ requestId: res.headers['x-request-id'], businessId: 'biz-1' }));
    expect(res.body.id).toBe(res.headers['x-request-id']);

    const completed = lines.find((l) => l.msg === 'request.completed');
    expect(completed).toEqual(expect.objectContaining({
      method: 'POST', path: '/things', status: 201, businessId: 'biz-1', level: 'info',
    }));
    expect(JSON.stringify(completed)).not.toContain('secret'); // query string is never logged
  });

  test('reuses a safe incoming request ID and replaces an unsafe one', async () => {
    const { obs } = build(options);
    const app = makeApp(obs);

    const good = await request(app).get('/health').set('X-Request-Id', 'abc-12345');
    expect(good.headers['x-request-id']).toBe('abc-12345');

    const bad = await request(app).get('/health').set('X-Request-Id', 'x y\tz{"inject":1}');
    expect(bad.headers['x-request-id']).not.toContain('inject');
  });

  test('skips successful health checks and logs 5xx at error level', async () => {
    const { obs, lines } = build(options);
    const app = makeApp(obs);
    await request(app).get('/health');
    await request(app).get('/boom');

    expect(lines.filter((l) => l.path === '/health')).toHaveLength(0);
    expect(lines.find((l) => l.path === '/boom')).toEqual(expect.objectContaining({ level: 'error', status: 500 }));
  });
});

describe('error reporting', () => {
  test('is a no-op without a DSN', () => {
    const { obs } = build();
    expect(obs.reporter.enabled).toBe(false);
    expect(() => obs.captureException(new Error('x'))).not.toThrow();
  });

  test('forwards redacted context to the injected Sentry client', () => {
    const sentry = { init: jest.fn(), captureException: jest.fn(), flush: jest.fn().mockResolvedValue(true) };
    const { obs } = build({ sentryDsn: 'https://k@example.ingest.sentry.io/1', sentry });
    obs.captureException(new Error('x'), { password: 'p', path: '/a' });

    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
    expect(sentry.captureException.mock.calls[0][1].extra).toEqual({ password: '[REDACTED]', path: '/a' });
  });

  test('beforeSend scrubs request headers', () => {
    const sentry = { init: jest.fn(), captureException: jest.fn(), flush: jest.fn() };
    build({ sentryDsn: 'https://k@example.ingest.sentry.io/1', sentry });
    const { beforeSend } = sentry.init.mock.calls[0][0];

    const event = beforeSend({ request: { headers: { authorization: 'Bearer x', host: 'h' }, cookies: { s: '1' } } });
    expect(event.request.headers.authorization).toBe('[REDACTED]');
    expect(event.request.cookies).toBe('[REDACTED]');
  });
});

describe('process handlers', () => {
  test('logs fatal, reports, flushes and exits 1 once', async () => {
    const { obs, lines } = build();
    const reporter = { captureException: jest.fn(), flush: jest.fn().mockResolvedValue(true) };
    const proc = new (require('events').EventEmitter)();
    const exit = jest.fn();
    const { installProcessHandlers } = require('../processHandlers');
    const uninstall = installProcessHandlers({ logger: obs.logger, reporter, exit, proc });

    proc.emit('uncaughtException', new Error('kaboom'));
    proc.emit('unhandledRejection', 'second');
    await new Promise((resolve) => setImmediate(resolve));

    expect(lines.filter((l) => l.level === 'fatal')).toHaveLength(1);
    expect(reporter.flush).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(exit).toHaveBeenCalledTimes(1);

    uninstall();
    expect(proc.listenerCount('uncaughtException')).toBe(0);
  });
});

test('createObservability requires a service name', () => {
  expect(() => createObservability({})).toThrow(/service/);
});
