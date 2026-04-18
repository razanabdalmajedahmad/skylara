import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ManifestValidation {
  canManifest: boolean;
  blockers: ManifestBlocker[];
}

interface ManifestBlocker {
  type: 'NOT_CHECKED_IN' | 'ALREADY_ON_LOAD' | 'LOAD_FULL' | 'LOAD_LOCKED' | 'INSUFFICIENT_BALANCE' | 'NO_TICKETS' | 'LICENSE_REQUIRED' | 'JUMP_TYPE_RESTRICTED';
  message: string;
}

export function useManifestValidation(loadId: number | undefined) {
  return useQuery<ManifestValidation>({
    queryKey: ['manifest-validation', loadId],
    queryFn: async () => {
      if (!loadId) return { canManifest: false, blockers: [] };
      const { data } = await api.get(`/loads/${loadId}/validate-manifest`);
      return data;
    },
    enabled: !!loadId,
    staleTime: 15_000,
  });
}
