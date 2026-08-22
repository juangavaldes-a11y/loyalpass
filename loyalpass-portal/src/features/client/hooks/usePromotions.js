import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPromotion, getPromotions, updatePromotion } from '@/features/client/api/promotionsApi';

export function usePromotions() {
  return useQuery({ queryKey: ['client', 'promotions'], queryFn: getPromotions });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPromotion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', 'promotions'] }),
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePromotion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', 'promotions'] }),
  });
}