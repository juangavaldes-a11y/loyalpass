const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Business = require('./Business');
const crypto = require('crypto');

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

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
    key_prefix: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    key_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    key: {
      type: DataTypes.VIRTUAL,
      set(value) {
        if (!value) return;
        this.setDataValue('key', value);
        this.setDataValue('key_prefix', value.slice(0, 12));
        this.setDataValue('key_hash', hashApiKey(value));
      },
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

ApiKey.issue = async function issue(businessId) {
  const key = `lp_${crypto.randomBytes(32).toString('hex')}`;
  const record = await ApiKey.create({ business_id: businessId, key });
  return { key, record };
};

ApiKey.hash = hashApiKey;

module.exports = ApiKey;
