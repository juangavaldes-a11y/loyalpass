const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define(
  'Payment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    subscription_id: { type: DataTypes.UUID, allowNull: true },
    provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'bac' },
    idempotency_key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    external_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    amount_minor: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pending' },
    paid_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  },
  { timestamps: true, tableName: 'payments' }
);

module.exports = Payment;