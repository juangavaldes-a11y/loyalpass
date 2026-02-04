const Pass = require('../models/Pass');
const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Points = require('../models/Points');
const ApplePassService = require('./applePassService');
const GooglePassService = require('./googlePassService');
const logger = require('../utils/logger');

class PassService {
  /**
   * Create pass for customer
   */
  static async createPass(businessId, customerId) {
    try {
      // Verify customer belongs to business
      const customer = await Customer.getById(customerId);
      if (!customer || customer.business_id !== businessId) {
        throw new Error('Customer not found or does not belong to this business');
      }

      // Get business and points
      const [business, points] = await Promise.all([
        Business.getById(businessId),
        Points.getByCustomerId(customerId),
      ]);

      if (!business) {
        throw new Error('Business not found');
      }

      if (!points) {
        throw new Error('Points record not found for customer');
      }

      // Generate Apple Pass
      let applePassSerial = null;
      try {
        applePassSerial = await ApplePassService.generatePass(
          business,
          customer,
          points
        );
      } catch (error) {
        logger.warn('Apple Pass generation failed:', error);
        // Don't fail entire operation if Apple fails
      }

      // Generate Google Pass
      let googlePassObjectId = null;
      try {
        googlePassObjectId = await GooglePassService.generatePass(
          businessId,
          customerId,
          business,
          customer,
          points
        );
      } catch (error) {
        logger.warn('Google Pass generation failed:', error);
        // Don't fail entire operation if Google fails
      }

      // Create pass record
      const pass = await Pass.create(
        businessId,
        customerId,
        applePassSerial,
        googlePassObjectId
      );

      logger.info(`Pass created: ${pass.id}`);

      return {
        pass,
        applePassSerial,
        googlePassObjectId,
      };
    } catch (error) {
      logger.error('Error creating pass:', error);
      throw error;
    }
  }

  /**
   * Update pass with points
   */
  static async updatePass(passId, customerId, newPoints) {
    try {
      const pass = await Pass.getById(passId);
      if (!pass || pass.customer_id !== customerId) {
        throw new Error('Pass not found');
      }

      // Update Apple Pass
      if (pass.apple_pass_serial) {
        try {
          await ApplePassService.updatePass(
            pass.apple_pass_serial,
            newPoints
          );
        } catch (error) {
          logger.warn('Apple Pass update failed:', error);
        }
      }

      // Update Google Pass
      if (pass.google_pass_object_id) {
        try {
          await GooglePassService.updatePass(
            pass.google_pass_object_id,
            newPoints
          );
        } catch (error) {
          logger.warn('Google Pass update failed:', error);
        }
      }

      logger.info(`Pass updated: ${passId}`);

      return pass;
    } catch (error) {
      logger.error('Error updating pass:', error);
      throw error;
    }
  }

  /**
   * Get pass for customer
   */
  static async getPassByCustomerId(customerId) {
    try {
      const pass = await Pass.getByCustomerId(customerId);
      if (!pass) {
        throw new Error('Pass not found for customer');
      }
      return pass;
    } catch (error) {
      logger.error('Error getting pass:', error);
      throw error;
    }
  }
}

module.exports = PassService;
