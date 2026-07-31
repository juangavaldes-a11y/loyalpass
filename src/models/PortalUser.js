const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PortalUser = sequelize.define(
  'PortalUser',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: 'portal_users',
  }
);

module.exports = PortalUser;
