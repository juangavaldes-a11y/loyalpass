import { useQuery } from '@tanstack/react-query';
import { getClientModules } from '@/features/client/api/modulesApi';

export function useClientModules() {
  return useQuery({
    queryKey: ['client', 'modules'],
    queryFn: getClientModules,
  });
}