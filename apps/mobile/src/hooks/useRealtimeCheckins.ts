/**
 * Hook for subscribing to real-time check-in updates via WebSocket
 * Keeps the manifest and user profile in sync
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useDropzoneStore } from '@/stores/dropzone';

/**
 * Subscribes to check-in updates for the active dropzone.
 * Invalidates checkins list and user profile queries when check-ins occur.
 */
export function useRealtimeCheckins() {
  const queryClient = useQueryClient();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  useEffect(() => {
    if (!dzId) return;

    const socket = getSocket();

    const handleCheckin = () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', dzId] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    };

    socket.on('checkin:update', handleCheckin);

    return () => {
      socket.off('checkin:update', handleCheckin);
    };
  }, [dzId, queryClient]);
}
