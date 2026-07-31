const { Points, Customer } = require('../models');
const AuditService = require('./auditService');
const WebhookService = require('./webhookService');
const logger = require('../utils/logger');

async function getScopedPoints(businessId, customerId) {
  return Points.findOne({
    where: { customer_id: customerId },
    include: [
      {
        model: Customer,
        where: { business_id: businessId },
        attributes: ['id', 'business_id'],
      },
    ],
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
  static async addPoints(businessId, customerId, amount) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const points = await getScopedPoints(businessId, customerId);
      if (!points) {
        throw new Error('Customer not found');
      }

      await points.increment('balance', { by: amount });
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'points.add',
        entityType: 'points',
        entityId: customerId,
        metadata: { amount },
      });
      await notifyWebhook('points.added', businessId, customerId, { amount, balance: points.balance + amount });
      logger.info('Points added successfully', {
        businessId,
        customerId,
        amount,
        newBalance: points.balance + amount,
      });

      return points.toJSON();
    } catch (error) {
      logger.error('Error adding points', error, { businessId, customerId, amount });
      throw error;
    }
  }

  /**
   * Redeem points
   */
  static async redeemPoints(businessId, customerId, amount) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const points = await getScopedPoints(businessId, customerId);
      if (!points) {
        throw new Error('Customer not found');
      }

      if (points.balance < amount) {
        throw new Error(
          `Insufficient points. Current balance: ${points.balance}`
        );
      }

      await points.decrement('balance', { by: amount });
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'points.redeem',
        entityType: 'points',
        entityId: customerId,
        metadata: { amount },
      });
      await notifyWebhook('points.redeemed', businessId, customerId, { amount, balance: points.balance - amount });
      logger.info('Points redeemed successfully', {
        businessId,
        customerId,
        amount,
        newBalance: points.balance - amount,
      });

      return points.toJSON();
    } catch (error) {
      logger.error('Error redeeming points', error, { businessId, customerId, amount });
      throw error;
    }
  }

  /**
   * Set points balance
   */
  static async setBalance(businessId, customerId, balance) {
    try {
      if (balance < 0) {
        throw new Error('Balance cannot be negative');
      }

      const points = await getScopedPoints(businessId, customerId);
      if (!points) {
        throw new Error('Customer not found');
      }

      await points.update({ balance });
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'points.set_balance',
        entityType: 'points',
        entityId: customerId,
        metadata: { balance },
      });
      await notifyWebhook('points.balance.set', businessId, customerId, { balance });
      logger.info('Points balance set successfully', {
        businessId,
        customerId,
        balance,
      });

      return points.toJSON();
    } catch (error) {
      logger.error('Error setting points balance', error, { businessId, customerId, balance });
      throw error;
    }
  }
}

module.exports = PointsService;
