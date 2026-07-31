import test from 'node:test';
import assert from 'node:assert/strict';

const { backendRequestWithBaseUrl } = await import('../src/lib/api/backendCore.js');

test('backendRequest forwards auth headers', async () => {
  let captured = null;

  global.fetch = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true, data: [] }),
    };
  };

  await backendRequestWithBaseUrl('http://backend.local', '/api/businesses', {
    method: 'GET',
    apiKey: 'test-key',
    headers: {
      Authorization: 'Bearer token-123',
    },
  });

  assert.equal(captured.url, 'http://backend.local/api/businesses');
  assert.equal(captured.options.headers['X-API-KEY'], 'test-key');
  assert.equal(captured.options.headers.Authorization, 'Bearer token-123');
});

test('backendRequest throws ApiError when response is not ok', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 403,
    text: async () => JSON.stringify({ message: 'Forbidden' }),
  });

  await assert.rejects(
    () => backendRequestWithBaseUrl('http://backend.local', '/api/businesses', { method: 'GET' }),
    (error) => {
      assert.equal(error.message, 'Forbidden');
      assert.equal(error.status, 403);
      return true;
    }
  );
});
