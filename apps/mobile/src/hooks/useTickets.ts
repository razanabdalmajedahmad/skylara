import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface JumpTicket {
  id: number;
  ticketType: string;
  totalJumps: number;
  remainingJumps: number;
  priceCents: number;
  expiresAt?: string;
  purchasedAt: string;
}

export function useTickets() {
  return useQuery<JumpTicket[]>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data } = await api.get('/jump-tickets');
      return data;
    },
  });
}

export function usePurchaseTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ticketType: string;
      quantity: number;
      paymentMethodId?: string;
    }) => {
      const { data } = await api.post('/jump-tickets/purchase', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
