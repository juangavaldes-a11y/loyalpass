const { Points } = require('../models');
const AuditService = require('./auditService');
const logger = require('../utils/logger');

async function createCustomerWithPoints(customer) {
  const points = await Points.create({
    customer_id: customer.id,
    balance: 0,
  });

  await AuditService.log({
    businessId: customer.business_id,
    actorType: 'user',
    actorId: customer.business_id,
    action: 'customer.create',
    entityType: 'customer',
    entityId: customer.id,
    metadata: { email: customer.email, name: customer.name },
  });

  logger.info(`Customer created: ${customer.id}`);
  return { customer, points };
}

module.exports = {
  createCustomerWithPoints,
};
