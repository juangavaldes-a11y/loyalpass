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

export async function updateBilling({ businessId, payload }) {
  const response = await portalApi.post('/admin/clients/billing', {
    businessId,
    payload,
  });
  return response.data;
}

export async function getQuotaStatus({ businessId }) {
  const response = await portalApi.get('/admin/clients/quota-status', {
    params: businessId ? { businessId } : {},
  });
  return response.data;
}

export async function getBusinessModules({ businessId }) {
  const response = await portalApi.get('/admin/clients/modules', { params: { businessId } });
  return response.data;
}

export async function updateBusinessModule({ businessId, moduleKey, enabled, reason }) {
  const response = await portalApi.put('/admin/clients/modules', {
    businessId,
    moduleKey,
    enabled,
    reason,
  });
  return response.data;
}
