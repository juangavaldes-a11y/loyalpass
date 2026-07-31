const { Business, ApiKey } = require('../models');
const AuditService = require('./auditService');
const logger = require('../utils/logger');
const { mapBusinessUpdates } = require('../utils/fieldMapping');
const { createBusinessOwnerContext, rotateBusinessApiKey } = require('./businessLifecycleService');
const { getPlanLimits, evaluateQuotaUsage } = require('../utils/planLimits');

const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    features: ['Up to 100 customers', '1 wallet pass type', 'Email support'],
  },
  growth: {
    name: 'Growth',
    monthlyPrice: 99,
    features: ['Up to 1000 customers', 'Advanced analytics', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 299,
    features: ['Unlimited customers', 'Custom integrations', 'Dedicated success manager'],
  },
};

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
   * Update billing state and subscription info
   */
  static async updateBilling(businessId, payload = {}) {
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
        action: 'business.billing.update',
        entityType: 'business',
        entityId: businessId,
        metadata: mappedUpdates,
      });

      logger.info(`Business billing updated: ${businessId}`);
      return business.toJSON();
    } catch (error) {
      logger.error('Error updating billing:', error);
      throw error;
    }
  }

  /**
   * Get quota plan and usage evaluation for a business
   */
  static async getQuotaStatus(businessId, usage = {}) {
    try {
      const business = await Business.findByPk(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      const plan = business.plan || 'starter';
      const quotas = {
        ...getPlanLimits(plan),
        ...(business.quota_overrides || {}),
      };

      return {
        businessId,
        plan,
        pricing: PRICING_TIERS[plan] || PRICING_TIERS.starter,
        quotas,
        usage,
        checks: Object.keys(quotas).reduce((acc, metric) => {
          acc[metric] = evaluateQuotaUsage({ plan, usage, quotas }, metric);
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Error checking quota status:', error);
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
