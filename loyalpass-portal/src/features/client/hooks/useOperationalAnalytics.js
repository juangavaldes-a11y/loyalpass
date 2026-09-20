import { useQuery } from '@tanstack/react-query';
import { getOperationalAnalytics } from '@/features/client/api/analyticsApi';

export function useOperationalAnalytics() {
  return useQuery({ queryKey: ['client', 'analytics'], queryFn: getOperationalAnalytics });
}