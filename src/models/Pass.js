const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Business = require('./Business');
const Customer = require('./Customer');

const Pass = sequelize.define(
  'Pass',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Business,
        key: 'id',
      },
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: Customer,
        key: 'id',
      },
    },
    apple_pass_serial: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    google_pass_object_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apple_push_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'passes',
  }
);

Pass.belongsTo(Business, { foreignKey: 'business_id' });
Pass.belongsTo(Customer, { foreignKey: 'customer_id' });

module.exports = Pass;
