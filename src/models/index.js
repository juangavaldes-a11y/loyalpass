/**
 * Centralized model index with associations
 */

const Business = require('./Business');
const Customer = require('./Customer');
const Points = require('./Points');
const Pass = require('./Pass');
const ApiKey = require('./ApiKey');
const PortalUser = require('./PortalUser');
const AuditLog = require('./AuditLog');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const Promotion = require('./Promotion');
const PromotionRedemption = require('./PromotionRedemption');

// Define associations
Business.hasMany(Customer, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(Pass, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(ApiKey, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(Subscription, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(Payment, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(Promotion, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(PromotionRedemption, { foreignKey: 'business_id', onDelete: 'CASCADE' });

Subscription.belongsTo(Business, { foreignKey: 'business_id' });
Subscription.hasMany(Payment, { foreignKey: 'subscription_id', onDelete: 'SET NULL' });
Payment.belongsTo(Business, { foreignKey: 'business_id' });
Payment.belongsTo(Subscription, { foreignKey: 'subscription_id' });
Promotion.belongsTo(Business, { foreignKey: 'business_id' });
Promotion.hasMany(PromotionRedemption, { foreignKey: 'promotion_id', onDelete: 'CASCADE' });
PromotionRedemption.belongsTo(Promotion, { foreignKey: 'promotion_id' });
PromotionRedemption.belongsTo(Customer, { foreignKey: 'customer_id' });

Points.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasOne(Points, { foreignKey: 'customer_id', as: 'points', onDelete: 'CASCADE' });
Customer.hasMany(Pass, { foreignKey: 'customer_id', onDelete: 'CASCADE' });

module.exports = {
  Business,
  Customer,
  Points,
  Pass,
  ApiKey,
  PortalUser,
  AuditLog,
  Subscription,
  Payment,
  Promotion,
  PromotionRedemption,
};
