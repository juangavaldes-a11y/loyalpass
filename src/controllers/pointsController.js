const PointsService = require('../services/pointsService');
const logger = require('../utils/logger');

class PointsController {
  /**
   * GET /api/points/:customerId
   */
  static async getPoints(req, res, next) {
    try {
      const { customerId } = req.params;

      const points = await PointsService.getPoints(customerId);

      res.status(200).json({
        success: true,
        data: points,
      });
    } catch (error) {
      if (error.message === 'Points not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/points/add
   */
  static async addPoints(req, res, next) {
    try {
      const { customer_id, amount } = req.body;

      if (!customer_id || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and amount are required',
        });
      }

      const points = await PointsService.addPoints(customer_id, amount);

      res.status(200).json({
        success: true,
        data: points,
        message: `${amount} points added successfully`,
      });
    } catch (error) {
      if (
        error.message.includes('must be greater than') ||
        error.message.includes('not found')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/points/redeem
   */
  static async redeemPoints(req, res, next) {
    try {
      const { customer_id, amount } = req.body;

      if (!customer_id || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and amount are required',
        });
      }

      const points = await PointsService.redeemPoints(customer_id, amount);

      res.status(200).json({
        success: true,
        data: points,
        message: `${amount} points redeemed successfully`,
      });
    } catch (error) {
      const statusCode = error.message.includes('Insufficient')
        ? 409
        : 400;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = PointsController;
