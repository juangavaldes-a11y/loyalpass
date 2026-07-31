const crypto = require('crypto');
const { Business, ApiKey } = require('../models');
const AuthService = require('./authService');
const AuditService = require('./auditService');
const logger = require('../utils/logger');

class BusinessService {
  /**
   * Create new business
   */
  static async createBusiness(name, logoUrl, brandColor, textColor) {
    try {
      // Create business
      const business = await Business.create({
        name,
        logo_url: logoUrl,
        brand_color: brandColor,
        text_color: textColor,
      });

      // Create API key for business
      const apiKey = await ApiKey.create({
        business_id: business.id,
      });

      const ownerPassword = crypto.randomBytes(8).toString('hex');
      const ownerUser = await AuthService.createBusinessOwnerUser(business, ownerPassword, apiKey.key);

      await AuditService.log({
        businessId: business.id,
        actorType: 'system',
        actorId: 'system',
        action: 'business.create',
        entityType: 'business',
        entityId: business.id,
        metadata: { name: business.name, ownerEmail: ownerUser.email },
      });

      logger.info(`Business created: ${business.id}`);

      return {
        business: business.toJSON(),
        apiKey: apiKey.key, // Only return the key once
        owner: {
          email: ownerUser.email,
          password: ownerPassword,
        },
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
      const business = await Business.findByPk(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      return business.toJSON();
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
      const business = await Business.findByPk(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Map incoming field names to model fields
      const mappedUpdates = {};
      if (updates.name) mappedUpdates.name = updates.name;
      if (updates.logoUrl) mappedUpdates.logo_url = updates.logoUrl;
      if (updates.brandColor) mappedUpdates.brand_color = updates.brandColor;
      if (updates.textColor) mappedUpdates.text_color = updates.textColor;

      await business.update(mappedUpdates);
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'business.update',
        entityType: 'business',
        entityId: businessId,
        metadata: mappedUpdates,
      });
      logger.info(`Business updated: ${businessId}`);
      return business.toJSON();
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
      return await ApiKey.findAll({
        where: { business_id: businessId },
        attributes: { exclude: ['key'] }, // Don't return the actual key
      });
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
      const apiKey = await ApiKey.create({
        business_id: businessId,
      });
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
      // Deactivate all existing keys
      await ApiKey.update(
        { active: false },
        { where: { business_id: businessId } }
      );

      // Create new key
      const newKey = await ApiKey.create({
        business_id: businessId,
      });
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'api_key.rotate',
        entityType: 'api_key',
        entityId: businessId,
      });
      logger.info(`API key rotated for business: ${businessId}`);
      return newKey.key;
    } catch (error) {
      logger.error('Error rotating API key:', error);
      throw error;
    }
  }

  static async listBusinesses() {
    try {
      return await Business.findAll({ order: [['createdAt', 'DESC']] });
    } catch (error) {
      logger.error('Error listing businesses:', error);
      throw error;
    }
  }

}

module.exports = BusinessService;
