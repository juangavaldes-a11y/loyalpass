const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Promotion, PromotionRedemption, Customer } = require('../models');
const AuditService = require('./auditService');

function normalizeAudienceRules(rules = {}) {
  const tagsAny = Array.isArray(rules.tagsAny) ? rules.tagsAny.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()).slice(0, 20) : [];
  return {
    tagsAny,
    requiresMarketingConsent: Boolean(rules.requiresMarketingConsent),
  };
}

function matchesAudience(customer, rules) {
  if (rules.requiresMarketingConsent && !customer.marketing_consent) return false;
  if (rules.tagsAny.length && !rules.tagsAny.some((tag) => (customer.tags || []).includes(tag))) return false;
  return true;
}

class PromotionService {
  static async createPromotion(businessId, payload) {
    if (!payload.name || !payload.reward_value || payload.reward_value < 1) {
      throw new Error('Promotion name and a positive reward value are required');
    }
    return Promotion.create({ ...payload, business_id: businessId, audience_rules: normalizeAudienceRules(payload.audience_rules) });
  }

  static async listPromotions(businessId) {
    return Promotion.findAll({ where: { business_id: businessId }, order: [['createdAt', 'DESC']] });
  }

  static async updatePromotion(businessId, promotionId, updates) {
    const promotion = await Promotion.findOne({ where: { id: promotionId, business_id: businessId } });
    if (!promotion) throw new Error('Promotion not found');
    await promotion.update({ ...updates, ...(updates.audience_rules ? { audience_rules: normalizeAudienceRules(updates.audience_rules) } : {}) });
    return promotion;
  }

  static async redeemPromotion(businessId, promotionId, customerId, idempotencyKey) {
    if (!idempotencyKey) throw new Error('Idempotency key is required');
    const existing = await PromotionRedemption.findOne({ where: { idempotency_key: idempotencyKey } });
    if (existing) return existing;

    return sequelize.transaction(async (transaction) => {
      const promotion = await Promotion.findOne({ where: { id: promotionId, business_id: businessId, status: 'published' }, transaction, lock: transaction.LOCK.UPDATE });
      const customer = await Customer.findOne({ where: { id: customerId, business_id: businessId }, transaction });
      if (!promotion || !customer) throw new Error('Promotion or customer not found');
      if (!matchesAudience(customer, normalizeAudienceRules(promotion.audience_rules))) throw new Error('Customer is not eligible for this promotion');
      const now = new Date();
      if ((promotion.starts_at && promotion.starts_at > now) || (promotion.ends_at && promotion.ends_at < now)) throw new Error('Promotion is not active');
      const redemptionCount = await PromotionRedemption.count({ where: { promotion_id: promotionId }, transaction });
      if (promotion.usage_limit && redemptionCount >= promotion.usage_limit) throw new Error('Promotion usage limit reached');
      const redemption = await PromotionRedemption.create({ promotion_id: promotionId, business_id: businessId, customer_id: customerId, idempotency_key: idempotencyKey, reward_value: promotion.reward_value }, { transaction });
      await AuditService.log({ businessId, actorType: 'user', actorId: customerId, action: 'promotion.redeem', entityType: 'promotion', entityId: promotionId, metadata: { redemptionId: redemption.id, rewardValue: promotion.reward_value } });
      return redemption;
    });
  }
}

module.exports = PromotionService;