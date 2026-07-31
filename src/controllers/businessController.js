const BusinessService = require('../services/businessService');
const ExportService = require('../services/exportService');
const SupportService = require('../services/supportService');
const logger = require('../utils/logger');
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

      logger.info('Business created via controller', {
        businessId: result?.business?.id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 201, { data: result });
    } catch (error) {
      logger.error('Business controller create flow failed', error, {
        path: req.path,
        method: req.method,
      });
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

      logger.info('Business updated via controller', {
        businessId: id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 200, { data: business });
    } catch (error) {
      logger.error('Business controller update flow failed', error, {
        businessId: id,
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  }

  /**
   * POST /api/businesses/:id/onboarding
   */
  static async updateOnboarding(req, res, next) {
    try {
      const { id } = req.params;

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return sendError(res, 403, error.message);
      }

      const business = await BusinessService.updateOnboarding(id, req.body);

      return sendSuccess(res, 200, { data: business });
    } catch (error) {
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /api/businesses/:id/billing
   */
  static async updateBilling(req, res, next) {
    try {
      const { id } = req.params;

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return sendError(res, 403, error.message);
      }

      const business = await BusinessService.updateBilling(id, req.body);

      return sendSuccess(res, 200, { data: business });
    } catch (error) {
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }

  /**
   * GET /api/businesses/:id/quota-status
   */
  static async getQuotaStatus(req, res, next) {
    try {
      const { id } = req.params;

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return sendError(res, 403, error.message);
      }

      const status = await BusinessService.getQuotaStatus(id, req.query);

      return sendSuccess(res, 200, { data: status });
    } catch (error) {
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
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

  static async exportBusinessData(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;

      try {
        assertBusinessAccess(req, id);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      const payload = await ExportService.exportBusinessData(id, format);
      logger.info('Business export requested', {
        businessId: id,
        format,
        path: req.path,
        method: req.method,
      });
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.status(200).send(payload);
      }

      return sendSuccess(res, 200, { data: payload });
    } catch (error) {
      logger.error('Business export flow failed', error, {
        businessId: req.params.id,
        path: req.path,
        method: req.method,
      });
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }

  static async deleteBusinessData(req, res, next) {
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

      const result = await ExportService.deleteBusinessData(id);
      logger.warn('Business data deletion requested', {
        businessId: id,
        path: req.path,
        method: req.method,
      });
      return sendSuccess(res, 200, { data: result, message: 'Data deletion workflow completed' });
    } catch (error) {
      logger.error('Business deletion flow failed', error, {
        businessId: req.params.id,
        path: req.path,
        method: req.method,
      });
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }

  static async getSupportPolicy(req, res, next) {
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

      const support = await SupportService.getSupportPolicy(id);
      return sendSuccess(res, 200, { data: { support } });
    } catch (error) {
      if (error.message === 'Business not found') {
        return sendError(res, 404, error.message);
      }
      next(error);
    }
  }
}

module.exports = BusinessController;
