import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface LoadSlot {
  id: string;
  userId: number;
  userName: string;
  slotType: string;
  jumpType: string;
  position?: string;
  isCheckedIn?: boolean;
  licenseLevel?: string;
  groupAssignment?: string;
  weight?: number;
}

export interface LoadDetailData {
  id: string;
  aircraftIdentifier: string;
  status: 'FILLING' | 'BOARDING' | 'LOCKED' | 'IN_FLIGHT' | 'COMPLETED';
  slotsAvailable: number;
  totalSlots: number;
  departureTime: string;
  slots: LoadSlot[];
  loadMaster?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  scheduledTime?: string;
}

export function useLoadDetail(loadId: number | string | undefined) {
  return useQuery({
    queryKey: ['load', loadId],
    queryFn: async () => {
      if (!loadId) return null;
      const { data } = await api.get<LoadDetailData>(`/loads/${loadId}`);
      return data;
    },
    enabled: !!loadId,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
