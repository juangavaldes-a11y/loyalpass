const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Promotion, PromotionRedemption, Customer } = require('../models');
const AuditService = require('./auditService');

class PromotionService {
  static async createPromotion(businessId, payload) {
    if (!payload.name || !payload.reward_value || payload.reward_value < 1) {
      throw new Error('Promotion name and a positive reward value are required');
    }
    return Promotion.create({ business_id: businessId, ...payload });
  }

  static async listPromotions(businessId) {
    return Promotion.findAll({ where: { business_id: businessId }, order: [['createdAt', 'DESC']] });
  }

  static async updatePromotion(businessId, promotionId, updates) {
    const promotion = await Promotion.findOne({ where: { id: promotionId, business_id: businessId } });
    if (!promotion) throw new Error('Promotion not found');
    await promotion.update(updates);
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