const rateLimit = require('express-rate-limit');

function getWindowMs(name, fallbackMinutes) {
  const raw = process.env[name];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMinutes * 60 * 1000;
  }
  return parsed * 60 * 1000;
}

function getMax(name, fallback) {
  const raw = process.env[name];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function buildLimiter({ windowMinutesEnv, maxEnv, defaultWindowMinutes, defaultMax, message }) {
  return rateLimit({
    windowMs: getWindowMs(windowMinutesEnv, defaultWindowMinutes),
    max: getMax(maxEnv, defaultMax),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
}

const generalApiLimiter = buildLimiter({
  windowMinutesEnv: 'RATE_LIMIT_GENERAL_WINDOW_MINUTES',
  maxEnv: 'RATE_LIMIT_GENERAL_MAX',
  defaultWindowMinutes: 15,
  defaultMax: 500,
  message: 'Too many requests. Please retry later.',
});

const authLimiter = buildLimiter({
  windowMinutesEnv: 'RATE_LIMIT_AUTH_WINDOW_MINUTES',
  maxEnv: 'RATE_LIMIT_AUTH_MAX',
  defaultWindowMinutes: 15,
  defaultMax: 25,
  message: 'Too many authentication attempts. Please retry later.',
});

const writeLimiter = buildLimiter({
  windowMinutesEnv: 'RATE_LIMIT_WRITE_WINDOW_MINUTES',
  maxEnv: 'RATE_LIMIT_WRITE_MAX',
  defaultWindowMinutes: 15,
  defaultMax: 150,
  message: 'Too many write operations. Please retry later.',
});

module.exports = {
  generalApiLimiter,
  authLimiter,
  writeLimiter,
};
