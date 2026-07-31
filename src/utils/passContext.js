const { Business, Customer, Points } = require('../models');

async function getPassContext(businessId, customerId) {
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.business_id !== businessId) {
    throw new Error('Customer not found or does not belong to this business');
  }

  const [business, points] = await Promise.all([
    Business.findByPk(businessId),
    Points.findOne({ where: { customer_id: customerId } }),
  ]);

  if (!business) {
    throw new Error('Business not found');
  }

  if (!points) {
    throw new Error('Points record not found for customer');
  }

  return {
    customer,
    business,
    points,
  };
}

module.exports = {
  getPassContext,
};
