import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Jumper {
  id: number;
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  licenseLevel?: string;
  totalJumps?: number;
}

export function useJumperSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['jumpers', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      const { data } = await api.get<Jumper[]>('/jumpers', {
        params: { search: searchTerm, limit: 20 },
      });
      return data;
    },
    enabled: searchTerm.length >= 2,
    staleTime: 30000,
  });
}
