const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actor_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    actor_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'audit_logs',
  }
);

module.exports = AuditLog;
