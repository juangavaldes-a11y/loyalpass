import { portalApi } from '@/lib/api/http';

export async function getCustomers() {
  const response = await portalApi.get('/client/customers');
  return response.data;
}

export async function createCustomer(payload) {
  const response = await portalApi.post('/client/customers', payload);
  return response.data;
}

export async function updateCustomer({ customerId, updates }) {
  const response = await portalApi.put('/client/customers', {
    customerId,
    updates,
  });
  return response.data;
}
