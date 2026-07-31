const crypto = require('crypto');
const { ApiKey } = require('../models');
const AuthService = require('./authService');
const AuditService = require('./auditService');
const logger = require('../utils/logger');

async function createBusinessOwnerContext(business) {
  const apiKey = await ApiKey.create({ business_id: business.id });
  const ownerPassword = crypto.randomBytes(8).toString('hex');
  const ownerUser = await AuthService.createBusinessOwnerUser(business, ownerPassword, apiKey.key);

  await AuditService.log({
    businessId: business.id,
    actorType: 'system',
    actorId: 'system',
    action: 'business.create',
    entityType: 'business',
    entityId: business.id,
    metadata: { name: business.name, ownerEmail: ownerUser.email },
  });

  logger.info(`Business created: ${business.id}`);

  return {
    apiKey,
    ownerPassword,
    ownerUser,
  };
}

async function rotateBusinessApiKey(businessId) {
  await ApiKey.update({ active: false }, { where: { business_id: businessId } });
  const newKey = await ApiKey.create({ business_id: businessId });

  await AuditService.log({
    businessId,
    actorType: 'user',
    actorId: businessId,
    action: 'api_key.rotate',
    entityType: 'api_key',
    entityId: businessId,
  });

  logger.info(`API key rotated for business: ${businessId}`);
  return newKey.key;
}

module.exports = {
  createBusinessOwnerContext,
  rotateBusinessApiKey,
};
