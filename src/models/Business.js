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
    plan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'starter',
    },
    onboarding_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'not_started',
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subscription_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'trial',
    },
    subscription_renews_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    billing_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    quota_overrides: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    pricing_tier: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'starter',
    },
  },
  {
    timestamps: true,
    tableName: 'businesses',
  }
);

module.exports = Business;
