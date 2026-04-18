import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Booking {
  id: number;
  type: 'TANDEM' | 'AFF' | 'FUN_JUMP' | 'COACH_JUMP';
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  scheduledDate: string;
  scheduledTime: string;
  packageId?: number;
  packageName?: string;
  price: number;
  currency: string;
  instructorId?: number;
  instructorName?: string;
  instructorPhoto?: string;
  instructorRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDetail extends Booking {
  notes?: string;
  location?: string;
  dzName?: string;
  qrCode?: string;
  timeline?: {
    event: string;
    timestamp: string;
    status: string;
  }[];
}

export interface Package {
  id: number;
  name: string;
  description: string;
  type: 'TANDEM' | 'AFF' | 'FUN_JUMP';
  jumpCount: number;
  price: number;
  currency: string;
  savingsPercent?: number;
  included?: string[];
}

export interface TimeSlot {
  id: string;
  time: string;
  available: number;
  total: number;
}

export function useBookings(status?: string) {
  return useQuery({
    queryKey: ['bookings', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get<Booking[]>(`/booking/my-bookings${params}`);
      return data;
    },
  });
}

export function useBookingDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get<BookingDetail>(`/booking/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingData: any) => {
      const { data } = await api.post<Booking>('/booking/create', bookingData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number | string) => {
      const { data } = await api.patch(`/booking/${bookingId}/cancel`);
      return data;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
  });
}

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const response = await api.get('/booking-packages');
      const raw = response.data as any;
      const items = Array.isArray(raw) ? raw : raw?.data ?? [];
      return items.map((p: any) => ({
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        type: (p.activityType || p.type || 'FUN_JUMP') as Package['type'],
        jumpCount: p.jumpCount ?? 1,
        price: p.priceCents != null ? p.priceCents / 100 : (p.price ?? 0),
        currency: p.currency || 'USD',
        savingsPercent: p.savingsPercent,
        included: Array.isArray(p.includes) ? p.includes : (p.included ?? []),
      })) as Package[];
    },
  });
}

export function useAvailableSlots(date: string | undefined) {
  return useQuery({
    queryKey: ['available-slots', date],
    queryFn: async () => {
      if (!date) return [];
      const { data } = await api.get<TimeSlot[]>(`/booking/available-slots?date=${date}`);
      return data;
    },
    enabled: !!date,
  });
}
