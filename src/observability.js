// Project wiring for the reusable observability module (src/lib/observability).
// Everything loyalpass-specific (service name, tenant fields) lives here, not in the module.

const { createObservability } = require('./lib/observability');

const observability = createObservability({
  service: 'loyalpass-backend',
  redactKeys: ['x-api-key', 'certificatePath', 'serviceAccountKeyPath'],
  extractContext: (req) => ({
    businessId: req.businessId || req.user?.businessId,
    userId: req.user?.sub,
    isPlatformAdmin: req.isPlatformAdmin ? true : undefined,
  }),
});

module.exports = observability;
