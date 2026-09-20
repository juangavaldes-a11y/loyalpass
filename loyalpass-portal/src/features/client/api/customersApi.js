import { portalApi } from '@/lib/api/http';

export async function getBusinessProfile() {
  const response = await portalApi.get('/client/business');
  return response.data;
}

export async function getCustomers({ search = '', page = 1, pageSize = 25 } = {}) {
  const response = await portalApi.get('/client/customers', {
    params: { search, page, pageSize },
  });
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
