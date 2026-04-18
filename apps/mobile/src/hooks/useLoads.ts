import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';

export interface Load {
  id: string;
  aircraftIdentifier: string;
  status: 'FILLING' | 'LOCKED' | 'BOARDING' | 'IN_FLIGHT' | 'COMPLETED';
  slotsAvailable: number;
  totalSlots: number;
  departureTime: string;
}

interface UseLoadsOptions {
  status?: string;
  enabled?: boolean;
}

export function useLoads(options?: UseLoadsOptions) {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  return useQuery({
    queryKey: ['loads', dzId, options?.status],
    queryFn: async () => {
      if (!dzId) return [];
      const params: Record<string, any> = {};
      if (options?.status) {
        params.status = options.status;
      }
      const response = await api.get('/loads', { params });
      return response.data as Load[];
    },
    enabled: !!dzId && (options?.enabled !== false),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
