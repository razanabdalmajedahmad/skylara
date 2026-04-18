import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CoachSession {
  id: string;
  type: 'TANDEM' | 'AFF' | 'COACHING';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    level?: string;
    totalJumps?: number;
  };
  rating?: number;
  notes?: string;
}

interface UseCoachSessionsOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  enabled?: boolean;
}

export function useCoachSessions(options?: UseCoachSessionsOptions) {
  return useQuery({
    queryKey: ['coach-sessions', options?.date, options?.startDate, options?.endDate, options?.status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (options?.date) params.date = options.date;
      if (options?.startDate) params.startDate = options.startDate;
      if (options?.endDate) params.endDate = options.endDate;
      if (options?.status) params.status = options.status;
      const response = await api.get('/coaching/sessions', { params });
      return response.data as CoachSession[];
    },
    enabled: options?.enabled !== false,
    staleTime: 30000,
  });
}
