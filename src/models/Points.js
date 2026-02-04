const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('./Customer');

const Points = sequelize.define(
  'Points',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: 'points',
    updatedAt: 'updated_at',
    createdAt: false,
  }
);

Points.belongsTo(Customer, { foreignKey: 'customer_id' });

module.exports = Points;
