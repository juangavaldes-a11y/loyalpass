const { formatLogPayload, createLogContext, sanitizeSensitiveData } = require('../utils/logger');

describe('logging helpers', () => {
  test('formats payloads into structured metadata', () => {
    const payload = formatLogPayload('business.update', { businessId: 'abc' });

    expect(payload).toEqual(expect.objectContaining({
      event: 'business.update',
      businessId: 'abc',
    }));
  });

  test('creates a consistent logging context', () => {
    const context = createLogContext({ requestId: 'req-1', route: '/api/businesses' });

    expect(context).toEqual(expect.objectContaining({ requestId: 'req-1', route: '/api/businesses' }));
  });

  test('redacts sensitive values before logging', () => {
    const sanitized = sanitizeSensitiveData({ password: 'secret', token: 'abc', safe: 'ok' });

    expect(sanitized).toEqual({ password: '[REDACTED]', token: '[REDACTED]', safe: 'ok' });
  });
});
