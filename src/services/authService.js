const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PortalUser, Business } = require('../models');
const logger = require('../utils/logger');

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

async function signAccessToken(payload) {
  return jwt.sign(payload, process.env.AUTH_SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL_SECONDS,
  });
}

async function verifyAccessToken(token) {
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.AUTH_SESSION_SECRET);
  } catch {
    return null;
  }
}

class AuthService {
  static async seedDefaultPlatformAdmin() {
    const email = process.env.PLATFORM_ADMIN_EMAIL;
    const password = process.env.PLATFORM_ADMIN_PASSWORD;

    await PortalUser.sync();

    if (!email || !password) {
      return null;
    }

    const existing = await PortalUser.findOne({ where: { email } });
    if (existing) {
      return existing;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await PortalUser.create({
      email,
      password_hash,
      role: 'platform_admin',
      business_id: null,
      active: true,
    });

    logger.info(`Seeded platform admin user: ${email}`);
    return user;
  }

  static async createBusinessOwnerUser(business, plaintextPassword, apiKey = null) {
    await PortalUser.sync();

    const password_hash = await bcrypt.hash(plaintextPassword, 10);
    const slug = business.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') || 'business';
    const email = `${slug}.${business.id.substring(0, 8)}@loyalpass.local`;

    const user = await PortalUser.create({
      email,
      password_hash,
      role: 'client_owner',
      business_id: business.id,
      api_key: apiKey,
      active: true,
    });

    return { user, email };
  }

  static async authenticate(email, password) {
    const user = await PortalUser.findOne({ where: { email, active: true } });
    if (!user) {
      return null;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return null;
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.business_id || '',
    });

    return {
      user: user.toJSON(),
      accessToken,
    };
  }

  static async verifyToken(token) {
    return verifyAccessToken(token);
  }
}

module.exports = AuthService;
