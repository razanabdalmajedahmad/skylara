/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * React hooks for offline-first functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSyncState, addToOutbox, processSyncQueue } from '../lib/syncEngine';
import { writeLocal, readLocal, optimisticUpdate, rollbackOnFailure, isOnline } from '../lib/localFirst';
import { syncOutboxStore } from '../lib/offlineStore';

interface OfflineStatus {
  isOnline: boolean;
  lastSync: Date;
  pendingActions: number;
  conflicts: number;
}

/**
 * Hook: Get offline status
 */
export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(() => {
    const syncState = getSyncState();
    return {
      isOnline: syncState.isOnline,
      lastSync: new Date(syncState.lastSyncTime),
      pendingActions: syncState.pendingCount,
      conflicts: syncState.conflictCount,
    };
  });

  useEffect(() => {
    const handleStateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const syncState = customEvent.detail;
      setStatus({
        isOnline: syncState.isOnline,
        lastSync: new Date(syncState.lastSyncTime),
        pendingActions: syncState.pendingCount,
        conflicts: syncState.conflictCount,
      });
    };

    window.addEventListener('skylara:sync-state-changed', handleStateChange);
    return () => window.removeEventListener('skylara:sync-state-changed', handleStateChange);
  }, []);

  return status;
}

/**
 * Hook: Local-first query (reads from IndexedDB first)
 */
export function useLocalQuery<T>(
  key: string[],
  fetcher: () => Promise<T>,
  options?: any,
) {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook: Local-first mutation (writes to IndexedDB then syncs)
 */
export function useLocalMutation<T, TPayload>(
  mutationFn: (payload: TPayload) => Promise<T>,
  options?: any,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TPayload) => {
      const syncState = getSyncState();
      return { wasOnline: syncState.isOnline };
    },
    onSuccess: (data: T, variables: TPayload, context: any) => {
      if (isOnline()) {
        processSyncQueue();
      }
      queryClient.invalidateQueries();
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: TPayload, context: any) => {
      if (!isOnline()) {
        return;
      }
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook: Get pending actions
 */
export function usePendingActions() {
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    const loadPending = async () => {
      const items = await syncOutboxStore.getPending();
      setPending(items);
    };

    loadPending();

    const handleStateChange = () => {
      loadPending();
    };

    window.addEventListener('skylara:sync-state-changed', handleStateChange);
    return () => window.removeEventListener('skylara:sync-state-changed', handleStateChange);
  }, []);

  return pending;
}

/**
 * Hook: Get conflicts
 */
export function useConflicts() {
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const loadConflicts = async () => {
      const items = await syncOutboxStore.getByStatus('CONFLICT');
      setConflicts(items);
    };

    loadConflicts();

    const handleStateChange = () => {
      loadConflicts();
    };

    window.addEventListener('skylara:sync-state-changed', handleStateChange);
    return () => window.removeEventListener('skylara:sync-state-changed', handleStateChange);
  }, []);

  return conflicts;
}

/**
 * Hook: Manual sync trigger
 */
export function useManualSync() {
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await processSyncQueue();
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing };
}
