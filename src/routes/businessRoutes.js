const express = require('express');
const BusinessController = require('../controllers/businessController');
const apiKeyAuth = require('../middleware/authMiddleware');

const router = express.Router();

// Create business (no auth - initial setup)
router.post('/', BusinessController.createBusiness);

// Require API key auth for all other routes
router.use(apiKeyAuth);

// Get business details
router.get('/:id', BusinessController.getBusiness);

// Update business
router.put('/:id', BusinessController.updateBusiness);

// API Key management
router.get('/:id/api-keys', BusinessController.getApiKeys);
router.post('/:id/api-keys', BusinessController.createApiKey);
router.post('/:id/api-keys/rotate', BusinessController.rotateApiKey);

module.exports = router;
