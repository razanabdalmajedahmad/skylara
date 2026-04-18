/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * Sync outbox engine for handling push-pull delta sync
 * Handles idempotency, conflict detection, and exponential backoff
 */

import { v4 as uuid } from 'uuid';
import { syncOutboxStore } from './offlineStore';
import { API_BASE_URL } from './constants';

interface SyncItem {
  id: string;
  idempotencyKey: string;
  entityType: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  retryCount: number;
  lastRetryTime?: number;
  conflictData?: Record<string, unknown>;
  createdAt: number;
  lastModified: number;
}

interface SyncState {
  lastSyncTime: number;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
}

let syncState: SyncState = {
  lastSyncTime: typeof window !== 'undefined' && localStorage.getItem('skylara_lastSync') ? parseInt(localStorage.getItem('skylara_lastSync')!) : 0,
  isSyncing: false,
  pendingCount: 0,
  conflictCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000, 60000];
const API_BASE = API_BASE_URL;

/**
 * Add action to sync outbox with idempotency key
 */
export async function addToOutbox(
  entityType: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>,
) {
  const idempotencyKey = uuid();
  const item: SyncItem = {
    id: uuid(),
    idempotencyKey,
    entityType,
    action,
    payload,
    status: 'PENDING',
    retryCount: 0,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  await syncOutboxStore.put(item);
  updatePendingCount();
  return idempotencyKey;
}

/**
 * Process sync queue - POST each pending item to /api/sync
 */
export async function processSyncQueue() {
  if (syncState.isSyncing || !syncState.isOnline) return;

  syncState.isSyncing = true;
  const pending = await syncOutboxStore.getPending();

  for (const item of pending) {
    try {
      await syncItem(item);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
    }
  }

  syncState.isSyncing = false;
  updatePendingCount();
  notifySyncStateChanged();
}

/**
 * Sync single item with retry logic
 */
async function syncItem(item: SyncItem) {
  const delay = BACKOFF_DELAYS[Math.min(item.retryCount, BACKOFF_DELAYS.length - 1)];
  const now = Date.now();

  if (item.lastRetryTime && now - item.lastRetryTime < delay) {
    return; // Not ready to retry yet
  }

  try {
    const response = await fetch(`${API_BASE}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': item.idempotencyKey,
      },
      body: JSON.stringify({
        entityType: item.entityType,
        action: item.action,
        payload: item.payload,
      }),
    });

    if (response.status === 409) {
      const conflict = await response.json();
      item.status = 'CONFLICT';
      item.conflictData = conflict;
      await syncOutboxStore.put(item);
      updateConflictCount();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    item.status = 'SYNCED';
    item.retryCount = 0;
    await syncOutboxStore.put(item);
    syncState.lastSyncTime = Date.now();
    if (typeof window !== 'undefined') localStorage.setItem('skylara_lastSync', String(syncState.lastSyncTime));
  } catch (error) {
    item.retryCount++;
    item.lastRetryTime = Date.now();
    item.status = 'PENDING';
    await syncOutboxStore.put(item);

    if (item.retryCount >= BACKOFF_DELAYS.length) {
      item.status = 'FAILED';
      await syncOutboxStore.put(item);
    }
  }
}

/**
 * Pull changes from server since last sync
 */
export async function pullChanges() {
  if (!syncState.isOnline) return null;

  try {
    const response = await fetch(`${API_BASE}/sync/pull?since=${syncState.lastSyncTime}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    syncState.lastSyncTime = Date.now();
    if (typeof window !== 'undefined') localStorage.setItem('skylara_lastSync', String(syncState.lastSyncTime));
    return data;
  } catch (error) {
    console.error('Failed to pull changes:', error);
    return null;
  }
}

/**
 * Resolve conflict with server data
 */
export async function resolveConflict(
  itemId: string,
  resolution: 'LOCAL' | 'SERVER' | 'MANUAL',
  mergedData?: Record<string, unknown>,
) {
  const item = await syncOutboxStore.getById(itemId);
  if (!item) return;

  try {
    const response = await fetch(`${API_BASE}/sync/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': item.idempotencyKey,
      },
      body: JSON.stringify({
        itemId,
        resolution,
        mergedData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (resolution === 'SERVER') {
      await syncOutboxStore.delete(itemId);
    } else {
      item.status = 'PENDING';
      item.retryCount = 0;
      if (resolution === 'MANUAL' && mergedData) {
        item.payload = mergedData;
      }
      await syncOutboxStore.put(item);
      await syncItem(item);
    }

    updateConflictCount();
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
  }
}

/**
 * Get last successful sync timestamp
 */
export function getLastSyncTime(): number {
  return syncState.lastSyncTime;
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return { ...syncState };
}

/**
 * Update pending count and notify
 */
async function updatePendingCount() {
  const pending = await syncOutboxStore.getPending();
  syncState.pendingCount = pending.length;
  notifySyncStateChanged();
}

/**
 * Update conflict count
 */
async function updateConflictCount() {
  const conflicts = await syncOutboxStore.getByStatus('CONFLICT');
  syncState.conflictCount = conflicts.length;
  notifySyncStateChanged();
}

/**
 * Notify listeners of state change
 */
function notifySyncStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('skylara:sync-state-changed', { detail: syncState }));
  }
}

/**
 * Auto-start sync when online, pause when offline
 */
export function initializeSync() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    syncState.isOnline = true;
    notifySyncStateChanged();
    processSyncQueue();
  });

  window.addEventListener('offline', () => {
    syncState.isOnline = false;
    notifySyncStateChanged();
  });

  updatePendingCount();
  updateConflictCount();

  setInterval(() => {
    if (syncState.isOnline && !syncState.isSyncing) {
      processSyncQueue();
    }
  }, 5000);
}

/**
 * Detect conflicts in server response
 */
export async function detectConflicts(serverResponse: any) {
  if (serverResponse.conflicts) {
    for (const conflict of serverResponse.conflicts) {
      const item = await syncOutboxStore.getByIdempotencyKey(conflict.idempotencyKey);
      if (item) {
        item.status = 'CONFLICT';
        item.conflictData = conflict.serverData;
        await syncOutboxStore.put(item);
      }
    }
    updateConflictCount();
  }
}
