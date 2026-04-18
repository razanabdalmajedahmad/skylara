/**
 * Hook for subscribing to real-time load updates via WebSocket
 * Automatically invalidates React Query cache on updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, subscribeToChannel, unsubscribeFromChannel } from '@/lib/socket';
import { useDropzoneStore } from '@/stores/dropzone';
import type { LoadUpdatePayload } from '@/types';

/**
 * Subscribes to WebSocket events for a specific load and invalidates
 * React Query cache when updates are received.
 *
 * @param loadId - The ID of the load to subscribe to (undefined = skip subscription)
 */
export function useRealtimeLoad(loadId: number | undefined) {
  const queryClient = useQueryClient();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  useEffect(() => {
    if (!loadId) return;

    const channel = `load:${loadId}`;
    subscribeToChannel(channel);

    const socket = getSocket();

    const handleLoadUpdate = (payload: LoadUpdatePayload) => {
      if (payload.loadId === loadId) {
        // Invalidate the load detail query so it refetches
        queryClient.invalidateQueries({ queryKey: ['load', dzId, loadId] });
        // Also invalidate load board
        queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
      }
    };

    const handleSlotUpdate = (payload: any) => {
      if (payload.loadId === loadId) {
        queryClient.invalidateQueries({ queryKey: ['load', dzId, loadId] });
        queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
      }
    };

    socket.on('load:update', handleLoadUpdate);
    socket.on('load:slot_added', handleSlotUpdate);
    socket.on('load:slot_removed', handleSlotUpdate);
    socket.on('load:status_changed', handleLoadUpdate);

    return () => {
      socket.off('load:update', handleLoadUpdate);
      socket.off('load:slot_added', handleSlotUpdate);
      socket.off('load:slot_removed', handleSlotUpdate);
      socket.off('load:status_changed', handleLoadUpdate);
      unsubscribeFromChannel(channel);
    };
  }, [loadId, dzId, queryClient]);
}
