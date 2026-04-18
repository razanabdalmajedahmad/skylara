/**
 * Hook for subscribing to real-time load board updates via WebSocket
 * Listens for all load events on the dropzone channel
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useDropzoneStore } from '@/stores/dropzone';

/**
 * Subscribes to all load updates for the active dropzone.
 * Invalidates the loads list query whenever a load is created, updated, or cancelled.
 */
export function useRealtimeLoads() {
  const queryClient = useQueryClient();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  useEffect(() => {
    if (!dzId) return;

    const socket = getSocket();

    const handleLoadUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
    };

    const handleNewLoad = () => {
      queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
    };

    const handleLoadCancelled = () => {
      queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
    };

    socket.on('load:update', handleLoadUpdate);
    socket.on('load:created', handleNewLoad);
    socket.on('load:cancelled', handleLoadCancelled);
    socket.on('load:status_changed', handleLoadUpdate);

    return () => {
      socket.off('load:update', handleLoadUpdate);
      socket.off('load:created', handleNewLoad);
      socket.off('load:cancelled', handleLoadCancelled);
      socket.off('load:status_changed', handleLoadUpdate);
    };
  }, [dzId, queryClient]);
}
