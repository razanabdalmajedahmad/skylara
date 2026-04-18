import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';

export interface Wallet {
  balanceCents: number;
  currency: string;
  jumpTickets: number;
}

export function useWallet() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  return useQuery({
    queryKey: ['wallet', dzId],
    queryFn: async () => {
      if (!dzId) return null;
      const response = await api.get('/wallet');
      const raw = response.data as any;
      // API returns { balance, currency } — map to expected shape
      return {
        balanceCents: raw.balance ?? 0,
        currency: raw.currency ?? 'USD',
        jumpTickets: raw.jumpTickets ?? 0,
      } as Wallet;
    },
    enabled: !!dzId,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
