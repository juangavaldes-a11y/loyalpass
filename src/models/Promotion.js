const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Promotion = sequelize.define(
  'Promotion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    reward_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'bonus_points' },
    reward_value: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    starts_at: { type: DataTypes.DATE, allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    usage_limit: { type: DataTypes.INTEGER, allowNull: true },
    audience_rules: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  },
  {
    timestamps: true,
    tableName: 'promotions',
    indexes: [{ fields: ['business_id', 'status'] }],
  }
);

module.exports = Promotion;