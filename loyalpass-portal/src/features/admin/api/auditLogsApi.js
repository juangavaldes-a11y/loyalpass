import { portalApi } from '@/lib/api/http';

export async function getAuditLogs(params = {}) {
  const response = await portalApi.get('/admin/audit-logs', { params });
  return response.data;
}
