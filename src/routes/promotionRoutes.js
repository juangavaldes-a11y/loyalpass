const express = require('express');
const PromotionController = require('../controllers/promotionController');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');
const { requireModule } = require('../middleware/moduleEntitlementMiddleware');

const router = express.Router();
router.use(requireModule('promotions'));
router.get('/', PromotionController.list);
router.post('/', writeLimiter, PromotionController.create);
router.put('/:id', writeLimiter, PromotionController.update);
router.post('/:id/redeem', writeLimiter, PromotionController.redeem);

module.exports = router;