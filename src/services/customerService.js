const Customer = require('../models/Customer');
const Points = require('../models/Points');
const logger = require('../utils/logger');

class CustomerService {
  /**
   * Create new customer
   */
  static async createCustomer(businessId, name, email) {
    try {
      // Check if customer already exists
      const existing = await Customer.getByEmail(businessId, email);
      if (existing) {
        throw new Error('Customer with this email already exists');
      }

      // Create customer
      const customer = await Customer.create(businessId, name, email);

      // Create points record
      await Points.create(customer.id, 0);

      logger.info(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer
   */
  static async getCustomer(customerId) {
    try {
      const customer = await Customer.getById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const points = await Points.getByCustomerId(customerId);

      return {
        ...customer,
        points: points ? points.balance : 0,
      };
    } catch (error) {
      logger.error('Error getting customer:', error);
      throw error;
    }
  }

  /**
   * Get customers for business
   */
  static async getCustomersByBusiness(businessId) {
    try {
      return await Customer.getByBusinessId(businessId);
    } catch (error) {
      logger.error('Error getting customers:', error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(customerId, updates) {
    try {
      const customer = await Customer.update(customerId, updates);
      if (!customer) {
        throw new Error('Customer not found');
      }
      logger.info(`Customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      logger.error('Error updating customer:', error);
      throw error;
    }
  }
}

module.exports = CustomerService;
