const BusinessService = require('../services/businessService');
const { assertPlatformAdmin, assertBusinessAccess } = require('../utils/tenantAccess');
const { sendSuccess, sendError } = require('../utils/httpResponses');

class BusinessController {
  /**
   * POST /api/businesses
   */
  static async createBusiness(req, res, next) {
    try {
      try {
        assertPlatformAdmin(req);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const { name, logo_url, brand_color, text_color } = req.body;

      if (!name) {
        return sendError(res, 400, 'Business name is required');
      }

      const result = await BusinessService.createBusiness(
        name,
        logo_url,
        brand_color,
        text_color
      );

      return sendSuccess(res, 201, { data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/businesses
   */
  static async listBusinesses(req, res, next) {
    try {
      try {
        assertPlatformAdmin(req);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const businesses = await BusinessService.listBusinesses();

      return sendSuccess(res, 200, {
        data: businesses,
        count: businesses.length,
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

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const business = await BusinessService.getBusiness(id);

      return sendSuccess(res, 200, { data: business });
    } catch (error) {
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
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

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const business = await BusinessService.updateBusiness(id, req.body);

      return sendSuccess(res, 200, { data: business });
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

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const apiKeys = await BusinessService.getApiKeys(id);

      return sendSuccess(res, 200, { data: apiKeys });
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

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const key = await BusinessService.createApiKey(id);

      return sendSuccess(res, 201, {
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

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const key = await BusinessService.rotateApiKey(id);

      return sendSuccess(res, 201, {
        data: { key },
        message: 'Old API keys have been deactivated',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BusinessController;
