import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface TransactionFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Transaction {
  id: number;
  uuid: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  currency?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

interface TransactionPage {
  data: Transaction[];
  total: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
}

export function useTransactions(filters?: TransactionFilters) {
  return useInfiniteQuery<TransactionPage>({
    queryKey: ['transactions', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get('/transactions', {
        params: { ...filters, offset: pageParam, limit: 20 },
      });
      const raw = response.data as any;
      const items = (Array.isArray(raw) ? raw : raw?.data ?? []).map((t: any) => ({
        id: t.id,
        uuid: t.uuid || '',
        type: t.type || 'CREDIT',
        amountCents: t.amountCents ?? t.amount ?? 0,
        balanceAfterCents: t.balanceAfterCents ?? t.balanceAfter ?? 0,
        description: t.description || '',
        currency: t.currency,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        createdAt: t.createdAt || '',
      }));
      const pagination = (response as any)._pagination;
      return {
        data: items,
        total: pagination?.total ?? items.length,
        offset: pageParam as number,
        limit: 20,
        nextOffset: items.length === 20 ? (pageParam as number) + 20 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });
}
