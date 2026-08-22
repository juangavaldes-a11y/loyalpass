import { portalApi } from '@/lib/api/http';

export async function getPromotions() {
  const response = await portalApi.get('/client/promotions');
  return response.data;
}

export async function createPromotion(payload) {
  const response = await portalApi.post('/client/promotions', payload);
  return response.data;
}

export async function updatePromotion({ promotionId, updates }) {
  const response = await portalApi.put('/client/promotions', { promotionId, updates });
  return response.data;
}