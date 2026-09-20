const sequelize = require('../config/db');
const { Business, Customer } = require('../models');
const PromotionService = require('../services/promotionService');

describe('promotion audiences', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('requires matching tags and marketing consent for audience-restricted promotions', async () => {
    const business = await Business.create({ name: 'Audience Business' });
    const eligible = await Customer.create({ business_id: business.id, name: 'Eligible', email: 'eligible@example.com', tags: ['vip'], marketing_consent: true });
    const ineligible = await Customer.create({ business_id: business.id, name: 'Ineligible', email: 'ineligible@example.com', tags: ['standard'], marketing_consent: false });
    const promotion = await PromotionService.createPromotion(business.id, {
      name: 'VIP reward', reward_value: 10, status: 'published', audience_rules: { tagsAny: ['vip'], requiresMarketingConsent: true },
    });

    await expect(PromotionService.redeemPromotion(business.id, promotion.id, ineligible.id, 'audience-ineligible')).rejects.toThrow('not eligible');
    await expect(PromotionService.redeemPromotion(business.id, promotion.id, eligible.id, 'audience-eligible')).resolves.toMatchObject({ customer_id: eligible.id });
  });
});