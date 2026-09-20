const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PointTransaction = sequelize.define(
  'PointTransaction',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    customer_id: { type: DataTypes.UUID, allowNull: false },
    points_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    balance_after: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'portal' },
    actor_id: { type: DataTypes.STRING(255), allowNull: true },
    idempotency_key: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  },
  { timestamps: true, tableName: 'point_transactions', updatedAt: false }
);

module.exports = PointTransaction;