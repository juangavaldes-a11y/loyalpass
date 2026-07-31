import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPass, getPass, updatePass } from '@/features/client/api/passesApi';

export function usePass(customerId) {
  return useQuery({
    queryKey: ['client', 'pass', customerId],
    queryFn: () => getPass(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCreatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPass,
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['client', 'pass', customerId] });
      queryClient.invalidateQueries({ queryKey: ['client', 'customers'] });
    },
  });
}

export function useUpdatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePass,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', 'pass', variables.customerId] });
    },
  });
}
