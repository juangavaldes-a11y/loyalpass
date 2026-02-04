const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Business = require('./Business');
const crypto = require('crypto');

const ApiKey = sequelize.define(
  'ApiKey',
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
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      defaultValue: () => crypto.randomBytes(32).toString('hex'),
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: 'api_keys',
  }
);

ApiKey.belongsTo(Business, { foreignKey: 'business_id' });

module.exports = ApiKey;
