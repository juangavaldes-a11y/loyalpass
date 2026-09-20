const MODULE_CATALOG = {
  customers: {
    key: 'customers',
    label: 'Customer management',
    dependencies: [],
  },
  points: {
    key: 'points',
    label: 'Points',
    dependencies: ['customers'],
  },
  passes: {
    key: 'passes',
    label: 'Wallet passes',
    dependencies: ['customers'],
  },
  promotions: {
    key: 'promotions',
    label: 'Promotions',
    dependencies: ['customers', 'points'],
  },
};

const PLAN_MODULES = {
  starter: ['customers', 'points', 'passes', 'promotions'],
  growth: ['customers', 'points', 'passes', 'promotions'],
  enterprise: ['customers', 'points', 'passes', 'promotions'],
};

function getPlanModules(plan) {
  return PLAN_MODULES[plan] || PLAN_MODULES.starter;
}

module.exports = {
  MODULE_CATALOG,
  getPlanModules,
};