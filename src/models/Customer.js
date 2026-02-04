const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Business = require('./Business');

const Customer = sequelize.define(
  'Customer',
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: 'customers',
    indexes: [
      {
        fields: ['business_id', 'email'],
        unique: true,
      },
    ],
  }
);

Customer.belongsTo(Business, { foreignKey: 'business_id' });

module.exports = Customer;
