/**
 * Hook for subscribing to real-time weather updates via WebSocket
 * Invalidates React Query cache when weather conditions change
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useDropzoneStore } from '@/stores/dropzone';

/**
 * Subscribes to weather updates for the active dropzone.
 * Invalidates the weather query whenever conditions are updated or a weather hold is issued.
 */
export function useRealtimeWeather() {
  const queryClient = useQueryClient();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  useEffect(() => {
    if (!dzId) return;

    const socket = getSocket();

    const handleWeatherUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['weather', dzId] });
    };

    const handleWeatherHold = () => {
      queryClient.invalidateQueries({ queryKey: ['weather', dzId] });
    };

    socket.on('weather:update', handleWeatherUpdate);
    socket.on('weather:hold', handleWeatherHold);

    return () => {
      socket.off('weather:update', handleWeatherUpdate);
      socket.off('weather:hold', handleWeatherHold);
    };
  }, [dzId, queryClient]);
}
