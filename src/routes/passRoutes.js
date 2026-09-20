const express = require('express');
const PassController = require('../controllers/passController');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');
const { requireModule } = require('../middleware/moduleEntitlementMiddleware');

const router = express.Router();
router.use(requireModule('passes'));

// Create pass
router.post('/create', writeLimiter, PassController.createPass);

// Update pass
router.post('/update', writeLimiter, PassController.updatePass);

// Get pass by customer
router.get('/:customerId', PassController.getPassByCustomer);

module.exports = router;
