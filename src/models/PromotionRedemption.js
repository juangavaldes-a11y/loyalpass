const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromotionRedemption = sequelize.define(
  'PromotionRedemption',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    promotion_id: { type: DataTypes.UUID, allowNull: false },
    business_id: { type: DataTypes.UUID, allowNull: false },
    customer_id: { type: DataTypes.UUID, allowNull: false },
    idempotency_key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    reward_value: { type: DataTypes.INTEGER, allowNull: false },
    redeemed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    timestamps: true,
    tableName: 'promotion_redemptions',
    indexes: [{ unique: true, fields: ['promotion_id', 'customer_id'] }],
  }
);

module.exports = PromotionRedemption;