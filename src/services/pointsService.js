const { Points, Customer } = require('../models');
const AuditService = require('./auditService');
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
      logger.info(
        `Points added: ${amount} to customer ${customerId}, new balance: ${points.balance + amount}`
      );

      return points.toJSON();
    } catch (error) {
      logger.error('Error adding points:', error);
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
      logger.info(
        `Points redeemed: ${amount} from customer ${customerId}, new balance: ${points.balance - amount}`
      );

      return points.toJSON();
    } catch (error) {
      logger.error('Error redeeming points:', error);
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
      logger.info(`Points balance set for customer ${customerId}: ${balance}`);

      return points.toJSON();
    } catch (error) {
      logger.error('Error setting points balance:', error);
      throw error;
    }
  }
}

module.exports = PointsService;
