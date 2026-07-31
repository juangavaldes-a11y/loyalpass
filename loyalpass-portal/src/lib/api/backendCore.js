import { ApiError } from './errors.js';

function buildFetchOptions({ method, body, apiKey, cacheMode, revalidate, tags, headers: extraHeaders = {} }) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }

  const options = {
    method,
    headers,
    cache: cacheMode,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  if (typeof revalidate === 'number' || (tags && tags.length > 0)) {
    options.next = {
      ...(typeof revalidate === 'number' ? { revalidate } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
    };
  }

  return options;
}

export async function backendRequestWithBaseUrl(apiBaseUrl, path, config = {}) {
  const {
    method = 'GET',
    body,
    apiKey,
    cacheMode = 'no-store',
    revalidate,
    tags = [],
    headers = {},
  } = config;

  const response = await fetch(
    `${apiBaseUrl}${path}`,
    buildFetchOptions({ method, body, apiKey, cacheMode, revalidate, tags, headers })
  );

  const raw = await response.text();
  let parsed = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new ApiError(
      parsed?.message || `Backend request failed with status ${response.status}`,
      response.status,
      parsed
    );
  }

  return parsed;
}
