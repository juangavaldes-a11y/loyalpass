import { portalApi } from '@/lib/api/http';

export async function getClientModules() {
  const response = await portalApi.get('/client/modules');
  return response.data;
}