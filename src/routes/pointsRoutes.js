const express = require('express');
const PointsController = require('../controllers/pointsController');

const router = express.Router();

// Get points
router.get('/:customerId', PointsController.getPoints);

// Add points
router.post('/add', PointsController.addPoints);

// Redeem points
router.post('/redeem', PointsController.redeemPoints);

module.exports = router;
