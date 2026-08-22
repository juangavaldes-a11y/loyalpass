const PromotionService = require('../services/promotionService');
const { sendSuccess, sendError } = require('../utils/httpResponses');

class PromotionController {
  static async create(req, res, next) {
    try { return sendSuccess(res, 201, { data: await PromotionService.createPromotion(req.businessId, req.body) }); } catch (error) { if (error.message.includes('required')) return sendError(res, 400, error.message); return next(error); }
  }

  static async list(req, res, next) {
    try { return sendSuccess(res, 200, { data: await PromotionService.listPromotions(req.businessId) }); } catch (error) { return next(error); }
  }

  static async update(req, res, next) {
    try { return sendSuccess(res, 200, { data: await PromotionService.updatePromotion(req.businessId, req.params.id, req.body) }); } catch (error) { if (error.message === 'Promotion not found') return sendError(res, 404, error.message); return next(error); }
  }

  static async redeem(req, res, next) {
    try { return sendSuccess(res, 201, { data: await PromotionService.redeemPromotion(req.businessId, req.params.id, req.body.customer_id, req.get('Idempotency-Key')) }); } catch (error) { if (error.message.includes('required') || error.message.includes('active') || error.message.includes('limit')) return sendError(res, 400, error.message); if (error.message.includes('not found')) return sendError(res, 404, error.message); return next(error); }
  }
}

module.exports = PromotionController;