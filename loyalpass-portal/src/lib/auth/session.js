import 'server-only';

import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'lp_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload) {
  const secret = getSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token) {
  if (!token) return null;

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
