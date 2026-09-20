import { portalApi } from '@/lib/api/http';

export async function getOperationalAnalytics() {
  const response = await portalApi.get('/client/analytics');
  return response.data;
}