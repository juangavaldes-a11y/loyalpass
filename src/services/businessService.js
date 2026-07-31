const { Business, ApiKey } = require('../models');
const AuditService = require('./auditService');
const logger = require('../utils/logger');
const { mapBusinessUpdates } = require('../utils/fieldMapping');
const { createBusinessOwnerContext, rotateBusinessApiKey } = require('./businessLifecycleService');

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

      const { apiKey, ownerPassword, ownerUser } = await createBusinessOwnerContext(business);

      return {
        business: business.toJSON(),
        apiKey: apiKey.key,
        owner: {
          email: ownerUser.email,
          password: ownerPassword,
        },
        plan: business.plan,
        onboardingStatus: business.onboarding_status,
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

      const mappedUpdates = mapBusinessUpdates(updates);

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
   * Update business onboarding state and plan
   */
  static async updateOnboarding(businessId, payload = {}) {
    try {
      const business = await Business.findByPk(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      const mappedUpdates = mapBusinessUpdates(payload);
      await business.update(mappedUpdates);

      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'business.onboarding.update',
        entityType: 'business',
        entityId: businessId,
        metadata: mappedUpdates,
      });

      logger.info(`Business onboarding updated: ${businessId}`);
      return business.toJSON();
    } catch (error) {
      logger.error('Error updating onboarding:', error);
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
      return rotateBusinessApiKey(businessId);
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
