const CustomerService = require('../services/customerService');
const logger = require('../utils/logger');
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
        logger.warn('Customer creation rejected due to missing fields', {
          businessId,
          path: req.path,
          method: req.method,
        });
        return sendError(res, 400, 'Name and email are required');
      }

      const customer = await CustomerService.createCustomer(
        businessId,
        name,
        email
      );

      logger.info('Customer created via controller', {
        businessId,
        customerId: customer?.id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 201, { data: customer });
    } catch (error) {
      logger.error('Customer controller create flow failed', error, {
        businessId: req.businessId,
        path: req.path,
        method: req.method,
      });
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

      logger.info('Customer fetched via controller', {
        businessId,
        customerId: id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 200, { data: customer });
    } catch (error) {
      logger.error('Customer controller fetch flow failed', error, {
        businessId: req.businessId,
        customerId: req.params.id,
        path: req.path,
        method: req.method,
      });
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

      logger.info('Customer list fetched via controller', {
        businessId,
        count: customers?.length || 0,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 200, {
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      logger.error('Customer controller list flow failed', error, {
        businessId: req.businessId,
        path: req.path,
        method: req.method,
      });
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

      logger.info('Customer updated via controller', {
        businessId,
        customerId: id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 200, { data: customer });
    } catch (error) {
      logger.error('Customer controller update flow failed', error, {
        businessId: req.businessId,
        customerId: req.params.id,
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  }
}

module.exports = CustomerController;
