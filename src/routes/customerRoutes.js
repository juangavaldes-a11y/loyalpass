const express = require('express');
const CustomerController = require('../controllers/customerController');

const router = express.Router();

// Create customer
router.post('/', CustomerController.createCustomer);

// List customers for business
router.get('/', CustomerController.listCustomers);

// Get customer details
router.get('/:id', CustomerController.getCustomer);

// Update customer
router.put('/:id', CustomerController.updateCustomer);

module.exports = router;
