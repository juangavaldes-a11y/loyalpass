const PointsService = require('../services/pointsService');
const { sendSuccess, sendError } = require('../utils/httpResponses');

class PointsController {
  /**
   * GET /api/points/:customerId
   */
  static async getPoints(req, res, next) {
    try {
      const { customerId } = req.params;
      const businessId = req.businessId;

      const points = await PointsService.getPoints(businessId, customerId);

      return sendSuccess(res, 200, { data: points });
    } catch (error) {
      if (error.message === 'Points not found') {
        return sendError(res, 404, error.message);
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
      const businessId = req.businessId;

      if (!customer_id || amount === undefined) {
        return sendError(res, 400, 'Customer ID and amount are required');
      }

      const points = await PointsService.addPoints(businessId, customer_id, amount);

      return sendSuccess(res, 200, {
        data: points,
        message: `${amount} points added successfully`,
      });
    } catch (error) {
      if (
        error.message.includes('must be greater than') ||
        error.message.includes('not found')
      ) {
        return sendError(res, 400, error.message);
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
      const businessId = req.businessId;

      if (!customer_id || amount === undefined) {
        return sendError(res, 400, 'Customer ID and amount are required');
      }

      const points = await PointsService.redeemPoints(businessId, customer_id, amount);

      return sendSuccess(res, 200, {
        data: points,
        message: `${amount} points redeemed successfully`,
      });
    } catch (error) {
      const statusCode = error.message.includes('Insufficient')
        ? 409
        : 400;
      return sendError(res, statusCode, error.message);
    }
  }
}

module.exports = PointsController;
