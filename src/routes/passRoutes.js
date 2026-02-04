const express = require('express');
const PassController = require('../controllers/passController');

const router = express.Router();

// Create pass
router.post('/create', PassController.createPass);

// Update pass
router.post('/update', PassController.updatePass);

// Get pass by customer
router.get('/:customerId', PassController.getPassByCustomer);

module.exports = router;
