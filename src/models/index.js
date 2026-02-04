/**
 * Centralized model index with associations
 */

const Business = require('./Business');
const Customer = require('./Customer');
const Points = require('./Points');
const Pass = require('./Pass');
const ApiKey = require('./ApiKey');

// Define associations
Business.hasMany(Customer, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(Pass, { foreignKey: 'business_id', onDelete: 'CASCADE' });
Business.hasMany(ApiKey, { foreignKey: 'business_id', onDelete: 'CASCADE' });

Customer.hasOne(Points, { foreignKey: 'customer_id', onDelete: 'CASCADE' });
Customer.hasMany(Pass, { foreignKey: 'customer_id', onDelete: 'CASCADE' });

module.exports = {
  Business,
  Customer,
  Points,
  Pass,
  ApiKey,
};
