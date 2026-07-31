const AuditService = require('../services/auditService');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

class AuditController {
  static async listAuditLogs(req, res, next) {
    try {
      const page = parsePositiveInt(req.query.page, 1);
      const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 25), 100);

      const filters = {
        businessId: req.query.businessId,
        actorType: req.query.actorType,
        actorId: req.query.actorId,
        action: req.query.action,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        from: req.query.from,
        to: req.query.to,
      };

      const result = await AuditService.listAuditLogs({
        page,
        pageSize,
        filters,
        user: {
          isPlatformAdmin: req.isPlatformAdmin,
          businessId: req.businessId,
        },
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      if (error.message === 'Invalid date range') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      return next(error);
    }
  }
}

module.exports = AuditController;
