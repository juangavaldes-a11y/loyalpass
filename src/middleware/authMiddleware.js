const ApiKey = require('../models/ApiKey');
const AuthService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Middleware to validate API key
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (bearerToken) {
      const session = await AuthService.verifyToken(bearerToken);
      if (!session?.businessId || !['client_owner', 'client_staff'].includes(session.role)) {
        return res.status(403).json({ success: false, message: 'Invalid client session' });
      }

      req.businessId = session.businessId;
      req.user = session;
      return next();
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required. Use X-API-KEY header.',
      });
    }

    // Store only a digest at rest and look it up by the non-sensitive prefix.
    const keyRecord = await ApiKey.findOne({
      where: {
        key_prefix: apiKey.slice(0, 12),
        key_hash: ApiKey.hash(apiKey),
        active: true,
      },
    });

    if (!keyRecord) {
      logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 10)}...`);
      return res.status(403).json({
        success: false,
        message: 'Invalid or inactive API key',
      });
    }

    // Attach business ID to request
    req.businessId = keyRecord.business_id;
    req.apiKeyId = keyRecord.id;

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

module.exports = apiKeyAuth;
