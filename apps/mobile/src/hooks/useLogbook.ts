import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getPagination } from '@/lib/api';

export interface LogbookEntry {
  id: number;
  jumpNumber: number;
  altitude: number | null;
  freefallTime: number | null;
  deploymentAltitude: number | null;
  canopySize: number | null;
  jumpType: string | null;
  disciplines: string[];
  notes: string | null;
  loadId: number | null;
  dropzoneId: number;
  dropzoneName?: string;
  coachSignOffId: number | null;
  instructorSignOffId: number | null;
  createdAt: string;
  load?: {
    id: number;
    aircraftIdentifier: string;
    departureTime: string;
  } | null;
  /** Present when API returns embedded coach sign-off */
  coachSignOff?: {
    coachName: string;
    notes?: string | null;
    signedAt: string;
  } | null;
}

export interface LogbookStats {
  totalJumps: number;
  totalFreefallTime: number;
  highestAltitude: number;
  lastJumpDate: string | null;
  disciplineBreakdown: Record<string, number>;
}

interface LogbookFilters {
  page?: number;
  limit?: number;
  jumpType?: string;
}

export function useLogbook(filters?: LogbookFilters) {
  return useQuery({
    queryKey: ['logbook', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.jumpType) params.jumpType = filters.jumpType;

      const response = await api.get('/logbook', { params });
      // After interceptor unwrap: response.data = LogbookEntry[]
      // Pagination metadata preserved on response._pagination
      const entries = (response.data ?? []) as LogbookEntry[];
      const pg = getPagination(response);
      return {
        entries,
        total: pg?.total ?? entries.length,
        page: pg?.page ?? 1,
        pages: pg?.totalPages ?? 1,
      };
    },
    staleTime: 60000,
  });
}

export function useLogbookEntry(id: number | string) {
  return useQuery({
    queryKey: ['logbook', 'entry', id],
    queryFn: async () => {
      const response = await api.get(`/logbook/${id}`);
      return response.data as LogbookEntry;
    },
    enabled: !!id,
  });
}

export function useLogbookStats() {
  return useQuery({
    queryKey: ['logbook', 'stats'],
    queryFn: async () => {
      const response = await api.get('/logbook/stats');
      return response.data as LogbookStats;
    },
    staleTime: 120000,
  });
}

interface CreateLogbookInput {
  jumpNumber: number;
  altitude?: number;
  freefallTime?: number;
  deploymentAltitude?: number;
  canopySize?: number;
  jumpType?: string;
  disciplines?: string[];
  notes?: string;
  loadId?: number;
  dropzoneId: number;
}

export function useCreateLogbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLogbookInput) => {
      const response = await api.post('/logbook', input);
      return response.data as LogbookEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logbook'] });
    },
  });
}

export function useUpdateLogbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateLogbookInput> & { id: number }) => {
      const response = await api.put(`/logbook/${id}`, input);
      return response.data as LogbookEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logbook'] });
    },
  });
}

export function useDeleteLogbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/logbook/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logbook'] });
    },
  });
}
