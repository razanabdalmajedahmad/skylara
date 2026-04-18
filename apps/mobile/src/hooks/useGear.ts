/**
 * React Query hooks for gear management
 * Handles fetching, creating, and updating gear items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GearItem, GearCheck } from '@/types';

/**
 * Fetches all gear items for the current user
 */
export function useGear() {
  return useQuery<GearItem[]>({
    queryKey: ['gear'],
    queryFn: async () => {
      const { data } = await api.get('/jumpers/me/gear');
      return data;
    },
  });
}

/**
 * Fetches a specific gear item with its check history
 *
 * @param gearId - The ID of the gear item to fetch
 */
export function useGearDetail(gearId: number | undefined) {
  return useQuery<GearItem & { checks: GearCheck[] }>({
    queryKey: ['gear', gearId],
    queryFn: async () => {
      const { data } = await api.get(`/jumpers/me/gear/${gearId}`);
      return data;
    },
    enabled: !!gearId,
  });
}

/**
 * Mutation for adding a new gear item
 */
export function useAddGear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gear: Omit<GearItem, 'id' | 'userId'>) => {
      const { data } = await api.post('/jumpers/me/gear', gear);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
}

/**
 * Mutation for updating an existing gear item
 */
export function useUpdateGear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...gear }: Partial<GearItem> & { id: number }) => {
      const { data } = await api.patch(`/jumpers/me/gear/${id}`, gear);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
      queryClient.invalidateQueries({ queryKey: ['gear', variables.id] });
    },
  });
}

/**
 * Mutation for deleting a gear item
 */
export function useDeleteGear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gearId: number) => {
      await api.delete(`/jumpers/me/gear/${gearId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
}

/**
 * Mutation for recording a gear check/inspection
 */
export function useRecordGearCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkData: {
      gearItemId: number;
      result: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/jumpers/me/gear/checks', checkData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
      queryClient.invalidateQueries({ queryKey: ['gear', variables.gearItemId] });
    },
  });
}
