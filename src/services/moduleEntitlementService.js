const { Business, BusinessModule } = require('../models');
const AuditService = require('./auditService');
const { MODULE_CATALOG, getPlanModules } = require('../config/moduleCatalog');

function getModule(moduleKey) {
  const module = MODULE_CATALOG[moduleKey];
  if (!module) {
    throw new Error('Unknown module');
  }
  return module;
}

class ModuleEntitlementService {
  static async getCapabilities(businessId) {
    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const overrides = await BusinessModule.findAll({ where: { business_id: businessId } });
    const overridesByKey = new Map(overrides.map((override) => [override.module_key, override]));
    const planModules = new Set(getPlanModules(business.plan));

    return Object.values(MODULE_CATALOG).map((module) => {
      const override = overridesByKey.get(module.key);
      return {
        ...module,
        enabled: override ? override.enabled : planModules.has(module.key),
        source: override ? 'override' : 'plan',
        reason: override?.reason || null,
      };
    });
  }

  static async isEnabled(businessId, moduleKey) {
    const capabilities = await this.getCapabilities(businessId);
    return capabilities.some((module) => module.key === moduleKey && module.enabled);
  }

  static async setModule({ businessId, moduleKey, enabled, reason, changedBy }) {
    const module = getModule(moduleKey);
    if (typeof enabled !== 'boolean') {
      throw new Error('Enabled must be a boolean');
    }
    if (!enabled && !reason?.trim()) {
      throw new Error('A reason is required when disabling a module');
    }

    const capabilities = await this.getCapabilities(businessId);
    if (!enabled) {
      const dependentModule = capabilities.find(
        (capability) => capability.enabled && capability.dependencies.includes(moduleKey)
      );
      if (dependentModule) {
        throw new Error(`Disable ${dependentModule.label} before disabling ${module.label}`);
      }
    }

    const [override, created] = await BusinessModule.findOrCreate({
      where: { business_id: businessId, module_key: moduleKey },
      defaults: { enabled, reason: reason?.trim() || null, changed_by: changedBy || null },
    });
    const previousEnabled = created ? null : override.enabled;
    if (!created) {
      await override.update({ enabled, reason: reason?.trim() || null, changed_by: changedBy || null });
    }

    await AuditService.log({
      businessId,
      actorType: 'user',
      actorId: changedBy || 'platform-admin',
      action: 'business.module.update',
      entityType: 'business_module',
      entityId: override.id,
      metadata: { moduleKey, previousEnabled, enabled, reason: reason?.trim() || null },
    });

    return override.toJSON();
  }
}

module.exports = ModuleEntitlementService;