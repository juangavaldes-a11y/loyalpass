import { portalApi } from '@/lib/api/http';

export async function getPoints(customerId) {
  const response = await portalApi.get('/client/points', {
    params: { customerId },
  });
  return response.data;
}

export async function addPoints({ customerId, amount }) {
  const response = await portalApi.post('/client/points', {
    action: 'add',
    customerId,
    amount,
  });
  return response.data;
}

export async function redeemPoints({ customerId, amount }) {
  const response = await portalApi.post('/client/points', {
    action: 'redeem',
    customerId,
    amount,
  });
  return response.data;
}
