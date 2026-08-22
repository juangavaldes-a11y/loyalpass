const { Business, Subscription, Payment } = require('../models');
const AuditService = require('./auditService');
const BacPaymentService = require('./bacPaymentService');

const PLAN_PRICES = { starter: 2900, growth: 9900, enterprise: 29900 };

class BillingService {
  static async createSubscription({ businessId, plan = 'starter', currency = 'USD', returnUrl, idempotencyKey }) {
    if (!PLAN_PRICES[plan]) throw new Error('Unknown billing plan');
    if (!idempotencyKey) throw new Error('Idempotency key is required');

    const business = await Business.findByPk(businessId);
    if (!business) throw new Error('Business not found');

    const subscription = await Subscription.create({ business_id: businessId, plan, provider: 'bac', status: 'pending' });
    try {
      const providerPayment = await BacPaymentService.createPayment({
        amountMinor: PLAN_PRICES[plan], currency, reference: subscription.id, returnUrl, idempotencyKey,
      });
      await subscription.update({ external_id: providerPayment.subscriptionId || providerPayment.id || null, status: 'incomplete' });
      await AuditService.log({ businessId, actorType: 'system', actorId: 'billing', action: 'subscription.create', entityType: 'subscription', entityId: subscription.id, metadata: { plan, provider: 'bac' } });
      return { subscription: subscription.toJSON(), provider: providerPayment };
    } catch (error) {
      await subscription.update({ status: 'failed', metadata: { error: error.message } });
      throw error;
    }
  }

  static async recordPayment({ businessId, subscriptionId, externalId, amountMinor, currency = 'USD', status, idempotencyKey, metadata = {} }) {
    if (!idempotencyKey) throw new Error('Idempotency key is required');
    const existing = await Payment.findOne({ where: { idempotency_key: idempotencyKey } });
    if (existing) return existing.toJSON();
    const payment = await Payment.create({ business_id: businessId, subscription_id: subscriptionId, external_id: externalId, amount_minor: amountMinor, currency, status, idempotency_key: idempotencyKey, paid_at: status === 'paid' ? new Date() : null, metadata });
    if (status === 'paid' && subscriptionId) await Subscription.update({ status: 'active' }, { where: { id: subscriptionId, business_id: businessId } });
    return payment.toJSON();
  }
}

module.exports = BillingService;