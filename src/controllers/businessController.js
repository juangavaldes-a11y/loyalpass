const BusinessService = require('../services/businessService');
const logger = require('../utils/logger');

class BusinessController {
  /**
   * POST /api/businesses
   */
  static async createBusiness(req, res, next) {
    try {
      const { name, logo_url, brand_color, text_color } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Business name is required',
        });
      }

      const result = await BusinessService.createBusiness(
        name,
        logo_url,
        brand_color,
        text_color
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/businesses/:id
   */
  static async getBusiness(req, res, next) {
    try {
      const { id } = req.params;

      // Verify business belongs to request (security check)
      if (id !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied',
        });
      }

      const business = await BusinessService.getBusiness(id);

      res.status(200).json({
        success: true,
        data: business,
      });
    } catch (error) {
      if (error.message === 'Business not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * PUT /api/businesses/:id
   */
  static async updateBusiness(req, res, next) {
    try {
      const { id } = req.params;

      // Verify business belongs to request
      if (id !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied',
        });
      }

      const business = await BusinessService.updateBusiness(id, req.body);

      res.status(200).json({
        success: true,
        data: business,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/businesses/:id/api-keys
   */
  static async getApiKeys(req, res, next) {
    try {
      const { id } = req.params;

      // Verify business belongs to request
      if (id !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied',
        });
      }

      const apiKeys = await BusinessService.getApiKeys(id);

      res.status(200).json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/businesses/:id/api-keys
   */
  static async createApiKey(req, res, next) {
    try {
      const { id } = req.params;

      // Verify business belongs to request
      if (id !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied',
        });
      }

      const key = await BusinessService.createApiKey(id);

      res.status(201).json({
        success: true,
        data: { key },
        message: 'Save this key securely. It will not be shown again.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/businesses/:id/api-keys/rotate
   */
  static async rotateApiKey(req, res, next) {
    try {
      const { id } = req.params;

      // Verify business belongs to request
      if (id !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied',
        });
      }

      const key = await BusinessService.rotateApiKey(id);

      res.status(201).json({
        success: true,
        data: { key },
        message: 'Old API keys have been deactivated',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BusinessController;
