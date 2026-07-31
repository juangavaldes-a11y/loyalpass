const { Customer, Points } = require('../models');
const AuditService = require('./auditService');
const logger = require('../utils/logger');
const { mapCustomerUpdates } = require('../utils/fieldMapping');
const { createCustomerWithPoints } = require('./customerLifecycleService');

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

      const { customer: createdCustomer } = await createCustomerWithPoints(customer);
      logger.info('Customer creation completed', {
        businessId,
        customerId: createdCustomer?.id,
      });
      return createdCustomer.toJSON();
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
        logger.warn('Customer lookup failed', { businessId, customerId });
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
      const customers = await Customer.findAll({
        where: { business_id: businessId },
        include: [{ model: Points, as: 'points' }],
      });
      logger.info('Customer list loaded', { businessId, count: customers?.length || 0 });
      return customers;
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
        logger.warn('Customer update target not found', { businessId, customerId });
        throw new Error('Customer not found');
      }

      const mappedUpdates = mapCustomerUpdates(updates);

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
