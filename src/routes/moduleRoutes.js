const express = require('express');
const ModuleEntitlementService = require('../services/moduleEntitlementService');
const { sendSuccess } = require('../utils/httpResponses');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const modules = await ModuleEntitlementService.getCapabilities(req.businessId);
    return sendSuccess(res, 200, { data: modules });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;