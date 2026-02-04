const Points = require('../models/Points');
const logger = require('../utils/logger');

class PointsService {
  /**
   * Get customer points
   */
  static async getPoints(customerId) {
    try {
      const points = await Points.getByCustomerId(customerId);
      if (!points) {
        throw new Error('Points not found');
      }
      return points;
    } catch (error) {
      logger.error('Error getting points:', error);
      throw error;
    }
  }

  /**
   * Add points to customer
   */
  static async addPoints(customerId, amount) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const points = await Points.add(customerId, amount);
      if (!points) {
        throw new Error('Customer not found');
      }

      logger.info(
        `Points added: ${amount} to customer ${customerId}, new balance: ${points.balance}`
      );

      return points;
    } catch (error) {
      logger.error('Error adding points:', error);
      throw error;
    }
  }

  /**
   * Redeem points
   */
  static async redeemPoints(customerId, amount) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const currentPoints = await Points.getByCustomerId(customerId);
      if (!currentPoints) {
        throw new Error('Customer not found');
      }

      if (currentPoints.balance < amount) {
        throw new Error(
          `Insufficient points. Current balance: ${currentPoints.balance}`
        );
      }

      const points = await Points.redeem(customerId, amount);

      logger.info(
        `Points redeemed: ${amount} from customer ${customerId}, new balance: ${points.balance}`
      );

      return points;
    } catch (error) {
      logger.error('Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * Set points balance
   */
  static async setBalance(customerId, balance) {
    try {
      if (balance < 0) {
        throw new Error('Balance cannot be negative');
      }

      const points = await Points.setBalance(customerId, balance);
      if (!points) {
        throw new Error('Customer not found');
      }

      logger.info(`Points balance set for customer ${customerId}: ${balance}`);

      return points;
    } catch (error) {
      logger.error('Error setting points balance:', error);
      throw error;
    }
  }
}

module.exports = PointsService;
