const PassService = require('../services/passService');
const logger = require('../utils/logger');

class PassController {
  /**
   * POST /api/passes/create
   */
  static async createPass(req, res, next) {
    try {
      const { customer_id } = req.body;
      const businessId = req.businessId;

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required',
        });
      }

      const result = await PassService.createPass(businessId, customer_id);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('does not belong')
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/passes/update
   */
  static async updatePass(req, res, next) {
    try {
      const { pass_id, customer_id } = req.body;

      if (!pass_id || !customer_id) {
        return res.status(400).json({
          success: false,
          message: 'Pass ID and Customer ID are required',
        });
      }

      const pass = await PassService.updatePass(pass_id, customer_id, null);

      res.status(200).json({
        success: true,
        data: pass,
      });
    } catch (error) {
      if (error.message === 'Pass not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/passes/:customerId
   */
  static async getPassByCustomer(req, res, next) {
    try {
      const { customerId } = req.params;

      const pass = await PassService.getPassByCustomerId(customerId);

      res.status(200).json({
        success: true,
        data: pass,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = PassController;
