const CustomerService = require('../services/customerService');
const logger = require('../utils/logger');

class CustomerController {
  /**
   * POST /api/customers
   */
  static async createCustomer(req, res, next) {
    try {
      const { name, email } = req.body;
      const businessId = req.businessId;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required',
        });
      }

      const customer = await CustomerService.createCustomer(
        businessId,
        name,
        email
      );

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
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

      const customer = await CustomerService.getCustomer(id);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
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

      res.status(200).json({
        success: true,
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

      const customer = await CustomerService.updateCustomer(id, req.body);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerController;
