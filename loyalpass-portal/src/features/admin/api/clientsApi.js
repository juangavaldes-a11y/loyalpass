import { portalApi } from '@/lib/api/http';

export async function createClient(payload) {
  const response = await portalApi.post('/admin/clients', payload);
  return response.data;
}

export async function getClient({ businessId } = {}) {
  const response = await portalApi.get('/admin/clients', {
    params: businessId ? { businessId } : {},
  });
  return response.data;
}

export async function updateClient({ businessId, updates }) {
  const response = await portalApi.put('/admin/clients', {
    businessId,
    updates,
  });
  return response.data;
}

export async function updateOnboarding({ businessId, payload }) {
  const response = await portalApi.post('/admin/clients/onboarding', {
    businessId,
    payload,
  });
  return response.data;
}
