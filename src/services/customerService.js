const { Customer, Points } = require('../models');
const AuditService = require('./auditService');
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

      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'customer.create',
        entityType: 'customer',
        entityId: customer.id,
        metadata: { email, name },
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
  static async getCustomer(businessId, customerId) {
    try {
      const customer = await Customer.findOne({
        where: { id: customerId, business_id: businessId },
        include: [{ model: Points, as: 'points' }],
      });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const result = customer.toJSON();
      result.points = customer.points?.balance || 0;
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
        include: [{ model: Points, as: 'points' }],
      });
    } catch (error) {
      logger.error('Error getting customers:', error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(businessId, customerId, updates) {
    try {
      const customer = await Customer.findOne({
        where: { id: customerId, business_id: businessId },
      });
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Map incoming field names to model fields
      const mappedUpdates = {};
      if (updates.name) mappedUpdates.name = updates.name;
      if (updates.email) mappedUpdates.email = updates.email;

      await customer.update(mappedUpdates);
      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'customer.update',
        entityType: 'customer',
        entityId: customerId,
        metadata: mappedUpdates,
      });
      logger.info(`Customer updated: ${customerId}`);
      return customer.toJSON();
    } catch (error) {
      logger.error('Error updating customer:', error);
      throw error;
    }
  }
}

module.exports = CustomerService;
