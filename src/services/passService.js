const { Pass } = require('../models');
const ApplePassService = require('./applePassService');
const GooglePassService = require('./googlePassService');
const AuditService = require('./auditService');
const logger = require('../utils/logger');
const { getPassContext } = require('../utils/passContext');

class PassService {
  /**
   * Create pass for customer
   */
  static async createPass(businessId, customerId) {
    try {
      const { customer, business, points } = await getPassContext(businessId, customerId);

      // Generate Apple Pass
      let applePassSerial = null;
      try {
        applePassSerial = await ApplePassService.generatePass(
          business.toJSON(),
          customer.toJSON(),
          points.toJSON()
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
          business.toJSON(),
          customer.toJSON(),
          points.toJSON()
        );
      } catch (error) {
        logger.warn('Google Pass generation failed:', error);
        // Don't fail entire operation if Google fails
      }

      // Create pass record
      const pass = await Pass.create({
        business_id: businessId,
        customer_id: customerId,
        apple_pass_serial: applePassSerial,
        google_pass_object_id: googlePassObjectId,
      });

      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'pass.create',
        entityType: 'pass',
        entityId: pass.id,
        metadata: { customerId, applePassSerial, googlePassObjectId },
      });

      logger.info('Pass created successfully', {
        businessId,
        customerId,
        passId: pass.id,
        applePassSerial,
        googlePassObjectId,
      });

      return {
        pass: pass.toJSON(),
        applePassSerial,
        googlePassObjectId,
      };
    } catch (error) {
      logger.error('Error creating pass', error, { businessId, customerId });
      throw error;
    }
  }

  /**
   * Update pass with points
   */
  static async updatePass(businessId, passId, customerId, newPoints) {
    try {
      const pass = await Pass.findOne({
        where: {
          id: passId,
          customer_id: customerId,
          business_id: businessId,
        },
      });
      if (!pass) {
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

      logger.info('Pass updated successfully', {
        businessId,
        customerId,
        passId,
        newPoints,
      });

      await AuditService.log({
        businessId,
        actorType: 'user',
        actorId: businessId,
        action: 'pass.update',
        entityType: 'pass',
        entityId: passId,
        metadata: { customerId, newPoints },
      });

      return pass.toJSON();
    } catch (error) {
      logger.error('Error updating pass', error, { businessId, passId, customerId, newPoints });
      throw error;
    }
  }

  /**
   * Get pass for customer
   */
  static async getPassByCustomerId(businessId, customerId) {
    try {
      const pass = await Pass.findOne({
        where: { customer_id: customerId, business_id: businessId },
      });
      if (!pass) {
        throw new Error('Pass not found for customer');
      }
      return pass.toJSON();
    } catch (error) {
      logger.error('Error getting pass:', error);
      throw error;
    }
  }
}

module.exports = PassService;
