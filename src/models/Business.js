const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Business = sequelize.define(
  'Business',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    brand_color: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
    text_color: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'businesses',
  }
);

module.exports = Business;
