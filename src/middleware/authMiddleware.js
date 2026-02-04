const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

/**
 * Middleware to validate API key
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required. Use X-API-KEY header.',
      });
    }

    // Look up the API key in database
    const keyRecord = await ApiKey.getByKey(apiKey);

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
