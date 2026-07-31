const requiredServerEnv = ['LOYALPASS_API_BASE_URL'];

function sanitizeUrl(url) {
  if (!url) return '';
  return url.replace(/\/$/, '');
}

function getMissingEnv(keys) {
  return keys.filter((key) => !process.env[key]);
}

const missing = getMissingEnv(requiredServerEnv);

if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  // Keep warning non-fatal to allow local UI work before backend wiring is complete.
  console.warn(`Missing server env vars: ${missing.join(', ')}`);
}

export const env = {
  apiBaseUrl: sanitizeUrl(process.env.LOYALPASS_API_BASE_URL || 'http://localhost:3000'),
  // Client management defaults. In production this should come from authenticated user context.
  defaultBusinessId: process.env.LOYALPASS_CLIENT_BUSINESS_ID || '',
  defaultClientApiKey: process.env.LOYALPASS_CLIENT_API_KEY || '',
};
