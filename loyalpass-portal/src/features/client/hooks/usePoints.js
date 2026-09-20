import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addPoints, getPointTransactions, getPoints, redeemPoints } from '@/features/client/api/pointsApi';

export function usePoints(customerId) {
  return useQuery({
    queryKey: ['client', 'points', customerId],
    queryFn: () => getPoints(customerId),
    enabled: Boolean(customerId),
  });
}

export function usePointTransactions(customerId) {
  return useQuery({
    queryKey: ['client', 'point-transactions', customerId],
    queryFn: () => getPointTransactions(customerId),
    enabled: Boolean(customerId),
  });
}

export function useAddPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPoints,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', 'points', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['client', 'point-transactions', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['client', 'customers'] });
    },
  });
}

export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redeemPoints,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', 'points', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['client', 'point-transactions', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['client', 'customers'] });
    },
  });
}
