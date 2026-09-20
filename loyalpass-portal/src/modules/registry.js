export const clientModuleRegistry = {
  customers: {
    key: 'customers',
    label: 'Customers',
    description: 'Manage loyalty members and member records.',
    anchor: 'customers',
    dependencies: [],
  },
  points: {
    key: 'points',
    label: 'Points',
    description: 'Issue and redeem loyalty balances.',
    anchor: 'points',
    dependencies: ['customers'],
  },
  passes: {
    key: 'passes',
    label: 'Wallet passes',
    description: 'Create and maintain wallet membership passes.',
    anchor: 'passes',
    dependencies: ['customers'],
  },
  promotions: {
    key: 'promotions',
    label: 'Promotions',
    description: 'Create offers and reward campaigns.',
    anchor: 'promotions',
    dependencies: ['customers', 'points'],
  },
};

export function getEnabledClientModules(capabilities = []) {
  const enabledKeys = new Set(capabilities.filter((capability) => capability.enabled).map((capability) => capability.key));
  return Object.values(clientModuleRegistry).filter((module) => enabledKeys.has(module.key));
}