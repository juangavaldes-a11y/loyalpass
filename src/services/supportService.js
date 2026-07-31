const { Business } = require('../models');

class SupportService {
  static async getSupportPolicy(businessId) {
    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const plan = business.plan || 'starter';
    const supportByPlan = {
      starter: {
        plan: 'starter',
        responseTime: '2 business days',
        channel: 'Email',
        sla: 'Best effort',
      },
      growth: {
        plan: 'growth',
        responseTime: '1 business day',
        channel: 'Email + chat',
        sla: 'Priority',
      },
      enterprise: {
        plan: 'enterprise',
        responseTime: '4 hours',
        channel: 'Dedicated manager',
        sla: 'Enterprise',
      },
    };

    return supportByPlan[plan] || supportByPlan.starter;
  }
}

module.exports = SupportService;
