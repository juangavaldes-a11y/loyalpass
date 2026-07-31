const { mapBusinessUpdates } = require('../utils/fieldMapping');

describe('business billing mapping', () => {
  test('maps billing payloads into model fields', () => {
    const updates = mapBusinessUpdates({
      subscriptionStatus: 'active',
      subscriptionRenewsAt: '2026-12-31T00:00:00.000Z',
      billingEmail: 'billing@example.com',
      quotaOverrides: { customers: 250 },
    });

    expect(updates).toEqual({
      subscription_status: 'active',
      subscription_renews_at: '2026-12-31T00:00:00.000Z',
      billing_email: 'billing@example.com',
      quota_overrides: { customers: 250 },
    });
  });
});
