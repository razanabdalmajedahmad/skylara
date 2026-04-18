/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * Local-first write flow with optimistic updates
 * Reads from IndexedDB, queues writes for sync
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadsStore, slotsStore, usersStore, gearChecksStore, emergencyProfilesStore } from './offlineStore';
import { addToOutbox, getSyncState } from './syncEngine';
import { API_BASE_URL } from './constants';

const API_BASE = API_BASE_URL;

/**
 * Check if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Write to IndexedDB first, then queue for sync
 */
export async function writeLocal(entityType: string, data: Record<string, unknown>) {
  const store = getStoreForEntity(entityType);
  if (!store) throw new Error(`Unknown entity type: ${entityType}`);

  await store.put(data as any);

  const action = data.id && (await store.getById(data.id as string)) ? 'UPDATE' : 'CREATE';
  const idempotencyKey = await addToOutbox(entityType, action, data);

  return { success: true, idempotencyKey };
}

/**
 * Read from IndexedDB, fall back to API if online
 */
export async function readLocal(entityType: string, id: string) {
  const store = getStoreForEntity(entityType);
  if (!store) throw new Error(`Unknown entity type: ${entityType}`);

  const local = await store.getById(id);
  if (local) return local;

  if (!isOnline()) return null;

  try {
    const response = await fetch(`${API_BASE}/${entityType}/${id}`);
    if (response.ok) {
      const data = await response.json();
      await store.put(data);
      return data;
    }
  } catch (error) {
    console.error(`Failed to fetch ${entityType}/${id}:`, error);
  }

  return null;
}

/**
 * Optimistic update of TanStack Query cache
 */
export function optimisticUpdate(
  queryClient: any,
  queryKey: any[],
  updater: (oldData: any) => any,
) {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    return updater(oldData);
  });
}

/**
 * Rollback optimistic update on failure
 */
export function rollbackOnFailure(queryClient: any, queryKey: any[], previousData: any) {
  queryClient.setQueryData(queryKey, previousData);
}

/**
 * Get SyncStatus component data
 */
export function useSyncStatus() {
  const syncState = getSyncState();
  return {
    lastSync: new Date(syncState.lastSyncTime),
    pendingCount: syncState.pendingCount,
    conflictCount: syncState.conflictCount,
    isOnline: syncState.isOnline,
  };
}

/**
 * Helper to get store by entity type
 */
function getStoreForEntity(entityType: string) {
  switch (entityType.toLowerCase()) {
    case 'load':
    case 'loads':
      return loadsStore;
    case 'slot':
    case 'slots':
      return slotsStore;
    case 'user':
    case 'users':
      return usersStore;
    case 'gearcheck':
    case 'gearchecks':
      return gearChecksStore;
    case 'emergencyprofile':
    case 'emergencyprofiles':
      return emergencyProfilesStore;
    default:
      return null;
  }
}
