const { Customer, Points } = require('../models');
const logger = require('../utils/logger');

class CustomerService {
  /**
   * Create new customer
   */
  static async createCustomer(businessId, name, email) {
    try {
      // Check if customer already exists
      const existing = await Customer.findOne({
        where: { business_id: businessId, email },
      });
      if (existing) {
        throw new Error('Customer with this email already exists');
      }

      // Create customer
      const customer = await Customer.create({
        business_id: businessId,
        name,
        email,
      });

      // Create points record
      await Points.create({
        customer_id: customer.id,
        balance: 0,
      });

      logger.info(`Customer created: ${customer.id}`);
      return customer.toJSON();
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer with points
   */
  static async getCustomer(customerId) {
    try {
      const customer = await Customer.findByPk(customerId, {
        include: ['Points'],
      });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const result = customer.toJSON();
      result.points = customer.Point?.balance || 0;
      return result;
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
      return await Customer.findAll({
        where: { business_id: businessId },
        include: ['Points'],
      });
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
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Map incoming field names to model fields
      const mappedUpdates = {};
      if (updates.name) mappedUpdates.name = updates.name;
      if (updates.email) mappedUpdates.email = updates.email;

      await customer.update(mappedUpdates);
      logger.info(`Customer updated: ${customerId}`);
      return customer.toJSON();
    } catch (error) {
      logger.error('Error updating customer:', error);
      throw error;
    }
  }
}

module.exports = CustomerService;
