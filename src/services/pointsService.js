const sequelize = require('../config/db');
const { Points, Customer, PointTransaction } = require('../models');
const AuditService = require('./auditService');
const WebhookService = require('./webhookService');
const logger = require('../utils/logger');

async function getScopedPoints(businessId, customerId, options = {}) {
  return Points.findOne({
    where: { customer_id: customerId },
    include: [
      {
        model: Customer,
        where: { business_id: businessId },
        attributes: ['id', 'business_id'],
      },
    ],
    ...options,
  });
}

async function notifyWebhook(event, businessId, customerId, payload = {}) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await WebhookService.deliver({
      url: webhookUrl,
      secret: process.env.WEBHOOK_SECRET,
      event,
      payload: {
        event,
        businessId,
        customerId,
        ...payload,
      },
    });
  } catch (error) {
    logger.warn('Webhook notification skipped', { error: error.message, event, businessId, customerId });
  }
}

class PointsService {
  /**
   * Get customer points
   */
  static async getPoints(businessId, customerId) {
    try {
      const points = await getScopedPoints(businessId, customerId);
      if (!points) {
        throw new Error('Points not found');
      }
      return points.toJSON();
    } catch (error) {
      logger.error('Error getting points:', error);
      throw error;
    }
  }

  /**
   * Add points to customer
   */
  static async addPoints(businessId, customerId, amount, options = {}) {
    return this.recordTransaction(businessId, customerId, amount, 'earn', options);
  }

  static async redeemPoints(businessId, customerId, amount, options = {}) {
    return this.recordTransaction(businessId, customerId, -amount, 'redeem', options);
  }

  static async recordTransaction(businessId, customerId, amount, action, { reason = null, idempotencyKey = null, actorId = null } = {}) {
    try {
      if (!Number.isInteger(amount) || amount === 0) {
        throw new Error('Amount must be greater than 0');
      }
      const result = await sequelize.transaction(async (transaction) => {
        if (idempotencyKey) {
          const existing = await PointTransaction.findOne({ where: { idempotency_key: idempotencyKey }, transaction });
          if (existing) {
            const existingPoints = await getScopedPoints(businessId, customerId, { transaction });
            return { points: existingPoints, transaction: existing, reused: true };
          }
        }

        const points = await getScopedPoints(businessId, customerId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!points) throw new Error('Customer not found');
        const balanceAfter = points.balance + amount;
        if (balanceAfter < 0) throw new Error(`Insufficient points. Current balance: ${points.balance}`);
        await points.update({ balance: balanceAfter }, { transaction });
        const pointTransaction = await PointTransaction.create({
          business_id: businessId,
          customer_id: customerId,
          points_id: points.id,
          action,
          amount,
          balance_after: balanceAfter,
          reason,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
        }, { transaction });
        return { points, transaction: pointTransaction, reused: false };
      });
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: actorId || businessId,
        action: `points.${action}`,
        entityType: 'point_transaction',
        entityId: customerId,
        metadata: { amount, reason, transactionId: result.transaction.id },
      });
      await notifyWebhook(`points.${action}`, businessId, customerId, { amount, balance: result.points.balance });
      logger.info('Points transaction recorded', {
        businessId,
        customerId,
        amount,
        action,
        newBalance: result.points.balance,
      });
      return result.points.toJSON();
    } catch (error) {
      logger.error('Error recording points transaction', error, { businessId, customerId, amount, action });
      throw error;
    }
  }

  static async getTransactions(businessId, customerId, { page = 1, pageSize = 20 } = {}) {
    const customer = await Customer.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new Error('Customer not found');
    const limit = Math.min(100, Math.max(1, pageSize));
    const { rows, count } = await PointTransaction.findAndCountAll({
      where: { business_id: businessId, customer_id: customerId },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (Math.max(1, page) - 1) * limit,
    });
    return { data: rows, pagination: { page: Math.max(1, page), pageSize: limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) } };
  }

  /**
   * Set points balance
   */
  static async setBalance(businessId, customerId, balance) {
    try {
      if (!Number.isInteger(balance) || balance < 0) {
        throw new Error('Balance cannot be negative');
      }

      const points = await getScopedPoints(businessId, customerId);
      if (!points) {
        throw new Error('Customer not found');
      }
      return this.recordTransaction(
        businessId,
        customerId,
        balance - points.balance,
        'adjustment',
        { reason: 'Balance set by operator' }
      );
    } catch (error) {
      logger.error('Error setting points balance', error, { businessId, customerId, balance });
      throw error;
    }
  }
}

module.exports = PointsService;
