import { portalApi } from '@/lib/api/http';

export async function getPoints(customerId) {
  const response = await portalApi.get('/client/points', {
    params: { customerId },
  });
  return response.data;
}

export async function getPointTransactions(customerId) {
  const response = await portalApi.get('/client/points', {
    params: { customerId, history: true },
  });
  return response.data;
}

export async function addPoints({ customerId, amount, reason }) {
  const response = await portalApi.post('/client/points', {
    action: 'add',
    customerId,
    amount,
    reason,
  });
  return response.data;
}

export async function redeemPoints({ customerId, amount, reason }) {
  const response = await portalApi.post('/client/points', {
    action: 'redeem',
    customerId,
    amount,
    reason,
  });
  return response.data;
}
