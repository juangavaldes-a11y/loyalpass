import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/features/admin/api/auditLogsApi';

export function useAuditLogs(params) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params || {}],
    queryFn: () => getAuditLogs(params || {}),
    enabled: true,
  });
}
