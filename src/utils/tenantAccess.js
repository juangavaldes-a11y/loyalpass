function assertPlatformAdmin(requestContext) {
  if (!requestContext?.isPlatformAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
}

function assertBusinessAccess(requestContext, targetBusinessId) {
  if (requestContext?.isPlatformAdmin) {
    return;
  }

  if (!requestContext?.businessId || requestContext.businessId !== targetBusinessId) {
    throw new Error('Forbidden: Access denied');
  }
}

module.exports = {
  assertPlatformAdmin,
  assertBusinessAccess,
};
