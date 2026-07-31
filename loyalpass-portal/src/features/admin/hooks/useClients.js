import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, getClient, updateClient, updateBilling, updateOnboarding, getQuotaStatus } from '@/features/admin/api/clientsApi';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
  });
}

export function useClientLookup(filters) {
  return useQuery({
    queryKey: ['admin', 'clients', filters.businessId || 'all'],
    queryFn: () => getClient(filters),
    enabled: true,
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'clients', variables.businessId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
  });
}

export function useUpdateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOnboarding,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'clients', variables.businessId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
  });
}

export function useUpdateBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBilling,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'clients', variables.businessId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
  });
}

export function useQuotaStatus(businessId) {
  return useQuery({
    queryKey: ['admin', 'quota-status', businessId || 'all'],
    queryFn: () => getQuotaStatus({ businessId }),
    enabled: Boolean(businessId),
  });
}
