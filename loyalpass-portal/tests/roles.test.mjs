import test from 'node:test';
import assert from 'node:assert/strict';

import { isRoleAllowed } from '../src/lib/auth/roles.js';

test('admin routes only allow platform admins', () => {
  assert.equal(isRoleAllowed('/admin', 'platform_admin'), true);
  assert.equal(isRoleAllowed('/admin', 'client_owner'), false);
});

test('client routes allow owner and staff roles', () => {
  assert.equal(isRoleAllowed('/client', 'client_owner'), true);
  assert.equal(isRoleAllowed('/client', 'client_staff'), true);
  assert.equal(isRoleAllowed('/client', 'platform_admin'), false);
});
