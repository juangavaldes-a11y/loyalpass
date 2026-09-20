const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BusinessModule = sequelize.define(
  'BusinessModule',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    module_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'business_modules',
    indexes: [{ unique: true, fields: ['business_id', 'module_key'] }],
  }
);

module.exports = BusinessModule;