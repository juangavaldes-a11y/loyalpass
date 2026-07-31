const { mapBusinessUpdates } = require('../utils/fieldMapping');

describe('business onboarding helpers', () => {
  test('maps onboarding progress updates into the model fields', () => {
    const updates = mapBusinessUpdates({ onboardingStatus: 'in_progress', plan: 'growth' });

    expect(updates).toEqual({ onboarding_status: 'in_progress', plan: 'growth' });
  });

  test('supports completion payloads for onboarding', () => {
    const updates = mapBusinessUpdates({ onboardingStatus: 'completed', trialEndsAt: '2026-12-31T00:00:00.000Z' });

    expect(updates).toEqual({ onboarding_status: 'completed', trial_ends_at: '2026-12-31T00:00:00.000Z' });
  });
});
