const { getPlanLimits, evaluateQuotaUsage } = require('../utils/planLimits');

describe('billing and quota helpers', () => {
  test('returns starter quotas by default', () => {
    const limits = getPlanLimits('starter');

    expect(limits).toEqual(expect.objectContaining({
      customers: 100,
      passes: 100,
      apiCalls: 1000,
    }));
  });

  test('returns higher quotas for growth tier', () => {
    const limits = getPlanLimits('growth');

    expect(limits).toEqual(expect.objectContaining({
      customers: 1000,
      passes: 1000,
      apiCalls: 10000,
    }));
  });

  test('flags usage that exceeds the configured quota', () => {
    const result = evaluateQuotaUsage({
      plan: 'starter',
      usage: { customers: 101 },
      quotas: { customers: 100 },
    }, 'customers');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('customers');
  });
});
