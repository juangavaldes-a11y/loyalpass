const Business = require('../models/Business');
const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

class BusinessService {
  /**
   * Create new business
   */
  static async createBusiness(name, logoUrl, brandColor, textColor) {
    try {
      // Create business
      const business = await Business.create(name, logoUrl, brandColor, textColor);

      // Create API key for business
      const apiKey = await ApiKey.create(business.id);

      logger.info(`Business created: ${business.id}`);

      return {
        business,
        apiKey: apiKey.key, // Only return the key once
      };
    } catch (error) {
      logger.error('Error creating business:', error);
      throw error;
    }
  }

  /**
   * Get business details
   */
  static async getBusiness(businessId) {
    try {
      const business = await Business.getById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      logger.error('Error getting business:', error);
      throw error;
    }
  }

  /**
   * Update business
   */
  static async updateBusiness(businessId, updates) {
    try {
      const business = await Business.update(businessId, updates);
      if (!business) {
        throw new Error('Business not found');
      }
      logger.info(`Business updated: ${businessId}`);
      return business;
    } catch (error) {
      logger.error('Error updating business:', error);
      throw error;
    }
  }

  /**
   * Get all API keys for business
   */
  static async getApiKeys(businessId) {
    try {
      return await ApiKey.getByBusinessId(businessId);
    } catch (error) {
      logger.error('Error getting API keys:', error);
      throw error;
    }
  }

  /**
   * Create new API key for business
   */
  static async createApiKey(businessId) {
    try {
      const apiKey = await ApiKey.create(businessId);
      logger.info(`API key created for business: ${businessId}`);
      return apiKey.key;
    } catch (error) {
      logger.error('Error creating API key:', error);
      throw error;
    }
  }

  /**
   * Rotate API key (deactivate old, create new)
   */
  static async rotateApiKey(businessId) {
    try {
      const newKey = await ApiKey.rotate(businessId);
      logger.info(`API key rotated for business: ${businessId}`);
      return newKey.key;
    } catch (error) {
      logger.error('Error rotating API key:', error);
      throw error;
    }
  }
}

module.exports = BusinessService;
