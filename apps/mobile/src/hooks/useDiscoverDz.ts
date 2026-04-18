import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DiscoverDropzone {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  icaoCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  windLimitKnots: number;
  status: string;
  country?: string;
  city?: string;
  elevation?: number;
  website?: string;
  phone?: string;
  description?: string;
  facilities?: string[];
  aircraft?: { name: string; capacity: number }[];
  activityTypes?: string[];
  organization: {
    id: number;
    name: string;
  };
}

interface SearchParams {
  query?: string;
  country?: string;
  activityType?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

/**
 * Hook for discovering dropzones.
 * Tries the public /dropzones endpoint first; falls back to /jumpers/me/dropzones.
 */
export function useDiscoverDz(params: SearchParams = {}) {
  return useQuery({
    queryKey: ['discover-dz', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set('q', params.query);
      if (params.country) searchParams.set('country', params.country);
      if (params.activityType) searchParams.set('activityType', params.activityType);
      if (params.lat) searchParams.set('lat', String(params.lat));
      if (params.lng) searchParams.set('lng', String(params.lng));
      if (params.radius) searchParams.set('radius', String(params.radius));

      try {
        // Try public search endpoint first
        const qs = searchParams.toString();
        const { data } = await api.get<DiscoverDropzone[]>(
          `/dropzones${qs ? `?${qs}` : ''}`
        );
        return data;
      } catch {
        // Fallback to user's dropzones if public endpoint unavailable
        try {
          const { data } = await api.get<DiscoverDropzone[]>('/jumpers/me/dropzones');
          // Client-side filter if query provided
          if (params.query) {
            const q = params.query.toLowerCase();
            return data.filter(
              (dz) =>
                dz.name.toLowerCase().includes(q) ||
                dz.slug?.toLowerCase().includes(q) ||
                dz.organization?.name?.toLowerCase().includes(q)
            );
          }
          return data;
        } catch {
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/**
 * Hook for fetching a single dropzone detail.
 */
export function useDropzoneDetail(dzId: number | string | undefined) {
  return useQuery({
    queryKey: ['dropzone-detail', dzId],
    queryFn: async () => {
      if (!dzId) return null;
      try {
        const { data } = await api.get<DiscoverDropzone>(`/dropzones/${dzId}`);
        return data;
      } catch {
        // Fallback: fetch user's DZ list and find by ID
        try {
          const { data: dzList } = await api.get<DiscoverDropzone[]>('/jumpers/me/dropzones');
          return dzList.find((dz) => String(dz.id) === String(dzId)) || null;
        } catch {
          return null;
        }
      }
    },
    enabled: !!dzId,
  });
}
