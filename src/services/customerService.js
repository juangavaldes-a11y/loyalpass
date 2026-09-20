const { Customer, Points } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const AuditService = require('./auditService');
const logger = require('../utils/logger');
const { mapCustomerUpdates } = require('../utils/fieldMapping');
const { createCustomerWithPoints } = require('./customerLifecycleService');

class CustomerService {
  /**
   * Create new customer
   */
  static async createCustomer(businessId, name, email, { tags = [], marketingConsent = false } = {}) {
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
        tags,
        marketing_consent: marketingConsent,
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
  static async getCustomersByBusiness(businessId, { search = '', page, pageSize } = {}) {
    try {
      const where = { business_id: businessId };
      if (search.trim()) {
        const likeOperator = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
        where[Op.or] = [
          { name: { [likeOperator]: `%${search.trim()}%` } },
          { email: { [likeOperator]: `%${search.trim()}%` } },
        ];
      }

      const options = {
        where,
        include: [{ model: Points, as: 'points' }],
        order: [['createdAt', 'DESC']],
      };
      if (page && pageSize) {
        options.limit = pageSize;
        options.offset = (page - 1) * pageSize;
      }

      const customers = await Customer.findAll(options);
      if (!page || !pageSize) {
        logger.info('Customer list loaded', { businessId, count: customers?.length || 0 });
        return customers;
      }

      const count = await Customer.count({ where });
      return {
        data: customers,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.max(1, Math.ceil(count / pageSize)),
        },
      };
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
