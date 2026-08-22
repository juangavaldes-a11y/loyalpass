const sequelize = require('../config/db');
const { Business, Customer, Promotion, PromotionRedemption } = require('../models');
const PromotionService = require('../services/promotionService');

describe('promotion service', () => {
  let business;
  let customer;

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    business = await Business.create({ name: 'Promotion Business' });
    customer = await Customer.create({ business_id: business.id, name: 'Member', email: 'member@example.com' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('publishes and redeems an active promotion once per customer', async () => {
    const promotion = await PromotionService.createPromotion(business.id, {
      name: 'Welcome bonus',
      reward_type: 'bonus_points',
      reward_value: 25,
      status: 'published',
    });

    const redemption = await PromotionService.redeemPromotion(business.id, promotion.id, customer.id, 'redeem-1');
    expect(redemption.reward_value).toBe(25);
    await expect(PromotionService.redeemPromotion(business.id, promotion.id, customer.id, 'redeem-2')).rejects.toThrow('Validation error');
  });

  test('rejects cross-business promotion access', async () => {
    const otherBusiness = await Business.create({ name: 'Other Business' });
    const promotion = await PromotionService.createPromotion(business.id, {
      name: 'Private offer',
      reward_value: 10,
      status: 'published',
    });
    const otherCustomer = await Customer.create({ business_id: otherBusiness.id, name: 'Other Member', email: 'other@example.com' });

    await expect(PromotionService.redeemPromotion(otherBusiness.id, promotion.id, otherCustomer.id, 'redeem-cross-tenant')).rejects.toThrow('not found');
    expect(await PromotionRedemption.count()).toBe(0);
  });
});
