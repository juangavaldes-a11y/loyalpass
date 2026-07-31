import { portalApi } from '@/lib/api/http';

export async function getPass(customerId) {
  const response = await portalApi.get('/client/passes', {
    params: { customerId },
  });
  return response.data;
}

export async function createPass(customerId) {
  const response = await portalApi.post('/client/passes', {
    action: 'create',
    customerId,
  });
  return response.data;
}

export async function updatePass({ customerId, passId }) {
  const response = await portalApi.post('/client/passes', {
    action: 'update',
    customerId,
    passId,
  });
  return response.data;
}
