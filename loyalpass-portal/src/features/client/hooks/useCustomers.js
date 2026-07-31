import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, getBusinessProfile, getCustomers, updateCustomer } from '@/features/client/api/customersApi';

export function useCustomers() {
  return useQuery({
    queryKey: ['client', 'customers'],
    queryFn: getCustomers,
  });
}

export function useBusinessProfile() {
  return useQuery({
    queryKey: ['client', 'business'],
    queryFn: getBusinessProfile,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'customers'] });
    },
  });
}
