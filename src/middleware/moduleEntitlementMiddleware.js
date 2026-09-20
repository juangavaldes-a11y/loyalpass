const ModuleEntitlementService = require('../services/moduleEntitlementService');

function requireModule(moduleKey) {
  return async (req, res, next) => {
    try {
      if (!req.businessId) {
        return res.status(401).json({ success: false, message: 'Business authentication is required' });
      }

      const enabled = await ModuleEntitlementService.isEnabled(req.businessId, moduleKey);
      if (!enabled) {
        return res.status(403).json({
          success: false,
          code: 'MODULE_DISABLED',
          message: `The ${moduleKey} module is not enabled for this business`,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireModule };