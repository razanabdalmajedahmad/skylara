import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PublicEventListItem = {
  id: number;
  title: string;
  slug: string;
  subtitle: string | null;
  shortDescription: string | null;
  eventType: string | null;
  discipline: string | null;
  organizerName: string | null;
  country: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number | null;
  currentParticipants: number | null;
  heroImageUrl: string | null;
  dropzone: { id: number; name: string; slug: string } | null;
};

export function usePublicEvents(options: { dropzoneId?: number | null; limit?: number }) {
  const { dropzoneId, limit = 40 } = options;

  return useQuery({
    queryKey: ['public-events', dropzoneId ?? 'all', limit],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit, offset: 0 };
      if (dropzoneId != null && dropzoneId > 0) {
        params.dropzoneId = dropzoneId;
      }
      const res = await api.get<{ events: PublicEventListItem[]; total: number }>('/public/events', { params });
      const payload = res.data as { events?: PublicEventListItem[]; total?: number };
      return {
        events: payload?.events ?? [],
        total: payload?.total ?? 0,
      };
    },
    staleTime: 60_000,
  });
}
