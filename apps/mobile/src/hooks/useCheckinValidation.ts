import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CheckinValidation {
  canCheckin: boolean;
  blockers: CheckinBlocker[];
  warnings: CheckinWarning[];
}

interface CheckinBlocker {
  type: 'WAIVER_MISSING' | 'WAIVER_EXPIRED' | 'LICENSE_MISSING' | 'GEAR_GROUNDED' | 'RESERVE_OVERDUE' | 'AAD_EXPIRED' | 'ACCOUNT_SUSPENDED';
  message: string;
}

interface CheckinWarning {
  type: 'WAIVER_EXPIRING' | 'REPACK_SOON' | 'AAD_EXPIRING' | 'LOW_JUMP_CURRENCY';
  message: string;
}

export function useCheckinValidation() {
  return useQuery<CheckinValidation>({
    queryKey: ['checkin-validation'],
    queryFn: async () => {
      const { data } = await api.get('/jumpers/me/checkin-validation');
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}
