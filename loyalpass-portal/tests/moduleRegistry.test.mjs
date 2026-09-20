import test from 'node:test';
import assert from 'node:assert/strict';

const { clientModuleRegistry, getEnabledClientModules } = await import('../src/modules/registry.js');

test('module registry exposes dependencies for composed client modules', () => {
  assert.deepEqual(clientModuleRegistry.points.dependencies, ['customers']);
  assert.deepEqual(clientModuleRegistry.promotions.dependencies, ['customers', 'points']);
});

test('capability filtering returns only enabled registered modules', () => {
  const modules = getEnabledClientModules([
    { key: 'customers', enabled: true },
    { key: 'promotions', enabled: false },
    { key: 'unknown', enabled: true },
  ]);

  assert.deepEqual(modules.map((module) => module.key), ['customers']);
});