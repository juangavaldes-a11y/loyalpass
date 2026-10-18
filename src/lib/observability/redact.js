// Key-based redaction and error serialization. Pure functions, no dependencies.

const SENSITIVE_KEY = /(password|passwd|secret|token|apikey|authorization|cookie|privatekey|credential)/;
const MAX_DEPTH = 8;

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key, extraKeys) {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY.test(normalized) || extraKeys.has(normalized);
}

// Error properties are non-enumerable, so Object.entries(err) is empty. Copy them explicitly.
function serializeError(err, depth = 0) {
  const serialized = {
    type: err.name || 'Error',
    message: err.message,
    stack: err.stack,
  };
  if (err.code !== undefined) serialized.code = err.code;
  if (err.statusCode !== undefined) serialized.statusCode = err.statusCode;
  if (err.cause !== undefined && depth < 3) {
    serialized.cause = err.cause instanceof Error ? serializeError(err.cause, depth + 1) : String(err.cause);
  }
  return serialized;
}

function redact(value, extraKeys = new Set(), seen = new WeakSet(), depth = 0) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' || typeof value === 'symbol' ? undefined : value;
  }
  if (value instanceof Error) return serializeError(value);
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return '[Buffer]';
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[MaxDepth]';

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => redact(item, extraKeys, seen, depth + 1));
    }
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[key] = isSensitiveKey(key, extraKeys) ? '[REDACTED]' : redact(item, extraKeys, seen, depth + 1);
      return acc;
    }, {});
  } finally {
    seen.delete(value);
  }
}

function createRedactor(extraKeys = []) {
  const keys = new Set(extraKeys.map(normalizeKey));
  return (value) => redact(value, keys);
}

module.exports = { redact, createRedactor, serializeError, isSensitiveKey };
