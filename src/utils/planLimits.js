const PLAN_LIMITS = {
  starter: {
    customers: 100,
    passes: 100,
    apiCalls: 1000,
  },
  growth: {
    customers: 1000,
    passes: 1000,
    apiCalls: 10000,
  },
  enterprise: {
    customers: 10000,
    passes: 10000,
    apiCalls: 100000,
  },
};

function getPlanLimits(plan = 'starter') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

function evaluateQuotaUsage({ plan, usage = {}, quotas = {} }, metric) {
  const effectiveQuotas = quotas && Object.keys(quotas).length > 0 ? quotas : getPlanLimits(plan);
  const limit = effectiveQuotas[metric];
  const currentUsage = usage[metric] || 0;

  if (typeof limit !== 'number') {
    return { allowed: true, limit, currentUsage, reason: 'No quota configured' };
  }

  return {
    allowed: currentUsage <= limit,
    limit,
    currentUsage,
    reason: currentUsage > limit ? `${metric} quota exceeded` : 'Within quota',
  };
}

module.exports = {
  PLAN_LIMITS,
  getPlanLimits,
  evaluateQuotaUsage,
};
