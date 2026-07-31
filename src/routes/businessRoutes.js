const express = require('express');
const BusinessController = require('../controllers/businessController');
const adminAuth = require('../middleware/adminAuthMiddleware');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Create and list businesses require admin auth
router.post('/', writeLimiter, adminAuth, BusinessController.createBusiness);
router.get('/', adminAuth, BusinessController.listBusinesses);

// Require JWT auth for all other routes
router.use(adminAuth);

// Get business details
router.get('/:id', BusinessController.getBusiness);

// Update business
router.put('/:id', writeLimiter, BusinessController.updateBusiness);
router.post('/:id/onboarding', writeLimiter, BusinessController.updateOnboarding);
router.post('/:id/billing', writeLimiter, BusinessController.updateBilling);
router.get('/:id/quota-status', BusinessController.getQuotaStatus);

// API Key management
router.get('/:id/api-keys', BusinessController.getApiKeys);
router.post('/:id/api-keys', writeLimiter, BusinessController.createApiKey);
router.post('/:id/api-keys/rotate', writeLimiter, BusinessController.rotateApiKey);
router.get('/:id/export', BusinessController.exportBusinessData);
router.delete('/:id/export', writeLimiter, BusinessController.deleteBusinessData);
router.get('/:id/support', BusinessController.getSupportPolicy);
router.post('/:id/backup', writeLimiter, BusinessController.createBackup);
router.post('/:id/restore', writeLimiter, BusinessController.restoreBackup);

module.exports = router;
