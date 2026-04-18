'use client';

/**
 * Offline-first manifest operations hook.
 * Bridges the existing offlineStore (IndexedDB) with manifest page.
 * When online: fetches from API, caches locally.
 * When offline: reads from IndexedDB, queues changes to syncOutbox.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadsStore, slotsStore, syncOutboxStore } from '@/lib/offlineStore';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { v4 as uuid } from 'uuid';

interface OfflineLoad {
  id: string;
  dzId: string;
  aircraftId: string;
  status: string;
  slotCount: number;
  filledSlots: number;
  pilotId: string;
  estimatedExitTime?: string;
  cgPass?: boolean;
  cgData?: Record<string, unknown>;
  lastModified: number;
  // Extended fields from API
  aircraft?: string;
  pilot?: string;
  slots?: any[];
}

interface UseOfflineManifestReturn {
  loads: OfflineLoad[];
  loading: boolean;
  isOffline: boolean;
  pendingSyncCount: number;
  lastSyncedAt: Date | null;
  refreshLoads: () => Promise<void>;
  createLoad: (data: Partial<OfflineLoad>) => Promise<string>;
  updateLoadStatus: (loadId: string, newStatus: string) => Promise<void>;
  addSlot: (loadId: string, slotData: any) => Promise<void>;
  syncNow: () => Promise<{ synced: number; failed: number }>;
}

export function useOfflineManifest(dropzoneId: string): UseOfflineManifestReturn {
  const [loads, setLoads] = useState<OfflineLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Count pending sync items
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await syncOutboxStore.getPending();
      setPendingSyncCount(pending.length);
    } catch { setPendingSyncCount(0); }
  }, []);

  // Fetch loads — online first, fallback to IndexedDB
  const refreshLoads = useCallback(async () => {
    setLoading(true);
    try {
      if (!isOffline) {
        // Online: fetch from API, cache locally
        const res = await apiGet<{ success: boolean; data: any[] }>(`/loads?dropzoneId=${dropzoneId}&limit=50`);
        const apiLoads = res?.data || [];

        // Cache each load in IndexedDB
        for (const load of apiLoads) {
          await loadsStore.put({
            id: String(load.id),
            dzId: dropzoneId,
            aircraftId: String(load.aircraftId || ''),
            status: load.status || 'OPEN',
            slotCount: load.maxSlots || load.slotCount || 0,
            filledSlots: load.filledSlots || load.slots?.length || 0,
            pilotId: String(load.pilotId || ''),
            estimatedExitTime: load.estimatedDeparture || load.estimatedExitTime,
            cgPass: load.cgPass,
            cgData: load.cgData,
            lastModified: Date.now(),
          });
        }

        setLoads(apiLoads.map((l: any) => ({ ...l, id: String(l.id), dzId: dropzoneId, lastModified: Date.now() })));
        setLastSyncedAt(new Date());
      } else {
        // Offline: read from IndexedDB
        const localLoads = await loadsStore.getAll();
        const filtered = localLoads.filter(l => l.dzId === dropzoneId);
        setLoads(filtered);
      }
    } catch (err) {
      // API failed — fall back to local cache
      console.warn('[OfflineManifest] API fetch failed, using local cache');
      const localLoads = await loadsStore.getAll();
      setLoads(localLoads.filter(l => l.dzId === dropzoneId));
    } finally {
      setLoading(false);
      await updatePendingCount();
    }
  }, [dropzoneId, isOffline, updatePendingCount]);

  // Create load — write locally + queue for sync
  const createLoad = useCallback(async (data: Partial<OfflineLoad>): Promise<string> => {
    const localId = uuid();
    const load: OfflineLoad = {
      id: localId,
      dzId: dropzoneId,
      aircraftId: data.aircraftId || '',
      status: 'OPEN',
      slotCount: data.slotCount || 0,
      filledSlots: 0,
      pilotId: data.pilotId || '',
      estimatedExitTime: data.estimatedExitTime,
      lastModified: Date.now(),
    };

    // Save to local IndexedDB immediately
    await loadsStore.put(load as any);
    setLoads(prev => [...prev, load]);

    if (!isOffline) {
      // Online: create via API too
      try {
        const res = await apiPost<{ success: boolean; data: any }>('/loads', {
          dropzoneId: parseInt(dropzoneId),
          aircraftId: parseInt(data.aircraftId || '0'),
          pilotId: parseInt(data.pilotId || '0'),
          maxSlots: data.slotCount || 22,
          estimatedDeparture: data.estimatedExitTime,
        });
        if (res?.data?.id) {
          // Update local with server ID
          await loadsStore.put({ ...load, id: String(res.data.id) } as any);
          return String(res.data.id);
        }
      } catch {
        // Queue for sync
        await syncOutboxStore.put({
          id: uuid(), idempotencyKey: `create-load-${localId}`,
          entityType: 'Load', action: 'CREATE', payload: load as unknown as Record<string, unknown>,
          status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
        });
      }
    } else {
      // Offline: queue for sync
      await syncOutboxStore.put({
        id: uuid(), idempotencyKey: `create-load-${localId}`,
        entityType: 'Load', action: 'CREATE', payload: load as unknown as Record<string, unknown>,
        status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
      });
    }

    await updatePendingCount();
    return localId;
  }, [dropzoneId, isOffline, updatePendingCount]);

  // Update load status — optimistic local update + sync
  const updateLoadStatus = useCallback(async (loadId: string, newStatus: string) => {
    // Optimistic local update
    const existing = await loadsStore.getById(loadId);
    if (existing) {
      await loadsStore.put({ ...existing, status: newStatus as any, lastModified: Date.now() });
    }
    setLoads(prev => prev.map(l => l.id === loadId ? { ...l, status: newStatus } : l));

    if (!isOffline) {
      try {
        await apiPost(`/loads/${loadId}/transition`, { targetStatus: newStatus });
      } catch {
        await syncOutboxStore.put({
          id: uuid(), idempotencyKey: `status-${loadId}-${newStatus}-${Date.now()}`,
          entityType: 'Load', action: 'UPDATE', payload: { loadId, status: newStatus } as Record<string, unknown>,
          status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
        });
      }
    } else {
      await syncOutboxStore.put({
        id: uuid(), idempotencyKey: `status-${loadId}-${newStatus}-${Date.now()}`,
        entityType: 'Load', action: 'UPDATE', payload: { loadId, status: newStatus } as Record<string, unknown>,
        status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
      });
    }
    await updatePendingCount();
  }, [isOffline, updatePendingCount]);

  // Add slot to load
  const addSlot = useCallback(async (loadId: string, slotData: any) => {
    const slotId = uuid();
    const slot = {
      id: slotId, loadId, dzId: dropzoneId,
      athleteId: slotData.athleteId, slotType: slotData.slotType || 'FUN',
      position: slotData.position || 0, status: 'ASSIGNED' as const,
      weight: slotData.weight, altitude: slotData.altitude,
      lastModified: Date.now(),
    };
    await slotsStore.put(slot);

    if (!isOffline) {
      try {
        await apiPost(`/loads/${loadId}/slots`, slotData);
      } catch {
        await syncOutboxStore.put({
          id: uuid(), idempotencyKey: `slot-${slotId}`,
          entityType: 'Slot', action: 'CREATE', payload: { ...slot, loadId } as Record<string, unknown>,
          status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
        });
      }
    } else {
      await syncOutboxStore.put({
        id: uuid(), idempotencyKey: `slot-${slotId}`,
        entityType: 'Slot', action: 'CREATE', payload: { ...slot, loadId } as Record<string, unknown>,
        status: 'PENDING', retryCount: 0, createdAt: Date.now(), lastModified: Date.now(),
      });
    }
    await updatePendingCount();
  }, [dropzoneId, isOffline, updatePendingCount]);

  // Manual sync — push all pending items
  const syncNow = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isOffline) return { synced: 0, failed: 0 };

    const pending = await syncOutboxStore.getPending();
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await apiPost('/sync/push', {
          entityType: item.entityType,
          action: item.action,
          payload: item.payload,
        }, { headers: { 'x-idempotency-key': item.idempotencyKey } } as any);

        await syncOutboxStore.put({ ...item, status: 'SYNCED' });
        synced++;
      } catch {
        await syncOutboxStore.put({ ...item, retryCount: item.retryCount + 1, lastRetryTime: Date.now() });
        failed++;
      }
    }

    await updatePendingCount();
    if (synced > 0) {
      setLastSyncedAt(new Date());
      await refreshLoads(); // Refresh with server data
    }
    return { synced, failed };
  }, [isOffline, updatePendingCount, refreshLoads]);

  // Initial load + auto-sync
  useEffect(() => {
    refreshLoads();
  }, [refreshLoads]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOffline && pendingSyncCount > 0) {
      syncNow();
    }
  }, [isOffline, pendingSyncCount, syncNow]);

  return {
    loads, loading, isOffline, pendingSyncCount, lastSyncedAt,
    refreshLoads, createLoad, updateLoadStatus, addSlot, syncNow,
  };
}
