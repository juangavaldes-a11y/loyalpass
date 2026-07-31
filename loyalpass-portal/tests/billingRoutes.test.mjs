import test from 'node:test';
import assert from 'node:assert/strict';

import { validateRequiredBusinessId } from '../src/app/api/admin/clients/routeUtils.js';

test('admin onboarding route validation rejects missing business id', () => {
  const result = validateRequiredBusinessId({ payload: {} });
  assert.equal(result.error.status, 400);
  assert.equal(result.error.message, 'businessId is required');
});
