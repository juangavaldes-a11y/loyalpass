const express = require('express');
const PointsController = require('../controllers/pointsController');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Get points
router.get('/:customerId', PointsController.getPoints);

// Add points
router.post('/add', writeLimiter, PointsController.addPoints);

// Redeem points
router.post('/redeem', writeLimiter, PointsController.redeemPoints);

module.exports = router;
