const express = require('express');
const CustomerController = require('../controllers/customerController');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Create customer
router.post('/', writeLimiter, CustomerController.createCustomer);

// List customers for business
router.get('/', CustomerController.listCustomers);

// Get customer details
router.get('/:id', CustomerController.getCustomer);

// Update customer
router.put('/:id', writeLimiter, CustomerController.updateCustomer);

module.exports = router;
