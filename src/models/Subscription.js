const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Subscription = sequelize.define(
  'Subscription',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'bac' },
    external_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    plan: { type: DataTypes.STRING(50), allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'incomplete' },
    current_period_start: { type: DataTypes.DATE, allowNull: true },
    current_period_end: { type: DataTypes.DATE, allowNull: true },
    cancel_at_period_end: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    metadata: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  },
  { timestamps: true, tableName: 'subscriptions' }
);

module.exports = Subscription;