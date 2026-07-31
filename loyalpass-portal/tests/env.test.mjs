import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LOYALPASS_API_BASE_URL = 'http://backend.local/';

const { env } = await import('../src/config/env.js');

test('env sanitizes trailing slashes from the backend URL', () => {
  assert.equal(env.apiBaseUrl, 'http://backend.local');
});
