const PassService = require('../services/passService');
const { sendSuccess, sendError } = require('../utils/httpResponses');

class PassController {
  /**
   * POST /api/passes/create
   */
  static async createPass(req, res, next) {
    try {
      const { customer_id } = req.body;
      const businessId = req.businessId;

      if (!customer_id) {
        return sendError(res, 400, 'Customer ID is required');
      }

      const result = await PassService.createPass(businessId, customer_id);

      return sendSuccess(res, 201, { data: result });
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('does not belong')
      ) {
        return sendError(res, 404, error.message);
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
      const businessId = req.businessId;

      if (!pass_id || !customer_id) {
        return sendError(res, 400, 'Pass ID and Customer ID are required');
      }

      const pass = await PassService.updatePass(businessId, pass_id, customer_id, null);

      return sendSuccess(res, 200, { data: pass });
    } catch (error) {
      if (error.message === 'Pass not found') {
        return sendError(res, 404, error.message);
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
      const businessId = req.businessId;

      const pass = await PassService.getPassByCustomerId(businessId, customerId);

      return sendSuccess(res, 200, { data: pass });
    } catch (error) {
      if (error.message.includes('not found')) {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }
}

module.exports = PassController;
