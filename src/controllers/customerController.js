const CustomerService = require('../services/customerService');
const { sendSuccess, sendError } = require('../utils/httpResponses');

class CustomerController {
  /**
   * POST /api/customers
   */
  static async createCustomer(req, res, next) {
    try {
      const { name, email } = req.body;
      const businessId = req.businessId;

      if (!name || !email) {
        return sendError(res, 400, 'Name and email are required');
      }

      const customer = await CustomerService.createCustomer(
        businessId,
        name,
        email
      );

      return sendSuccess(res, 201, { data: customer });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return sendError(res, 409, error.message);
      }
      next(error);
    }
  }

  /**
   * GET /api/customers/:id
   */
  static async getCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const businessId = req.businessId;

      const customer = await CustomerService.getCustomer(businessId, id);

      return sendSuccess(res, 200, { data: customer });
    } catch (error) {
      if (error.message === 'Customer not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }

  /**
   * GET /api/customers
   */
  static async listCustomers(req, res, next) {
    try {
      const businessId = req.businessId;

      const customers = await CustomerService.getCustomersByBusiness(businessId);

      return sendSuccess(res, 200, {
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/customers/:id
   */
  static async updateCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const businessId = req.businessId;

      const customer = await CustomerService.updateCustomer(businessId, id, req.body);

      return sendSuccess(res, 200, { data: customer });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerController;
