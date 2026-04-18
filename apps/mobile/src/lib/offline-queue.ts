import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

interface QueuedAction {
  id: string;
  type: 'CHECKIN' | 'CHECKOUT' | 'MANIFEST' | 'REMOVE_FROM_LOAD' | 'SEND_MESSAGE';
  payload: Record<string, any>;
  dzId?: number;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  createdAt: string;
  retryCount: number;
  maxRetries: number;
}

interface DroppedAction {
  action: QueuedAction;
  error: string;
}

type OnDropCallback = (dropped: DroppedAction[]) => void;

interface OfflineQueueState {
  queue: QueuedAction[];
  isOnline: boolean;
  isSyncing: boolean;
  droppedActions: DroppedAction[];

  initialize: () => Promise<void>;
  enqueue: (action: Omit<QueuedAction, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>) => Promise<void>;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  clearDropped: () => void;
  onDrop: OnDropCallback | null;
  setOnDrop: (cb: OnDropCallback | null) => void;
}

const QUEUE_STORAGE_KEY = 'skylara_offline_queue';

let netInfoUnsubscribe: (() => void) | undefined;

export const useOfflineQueue = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,
  droppedActions: [],
  onDrop: null,

  setOnDrop: (cb) => set({ onDrop: cb }),

  clearDropped: () => set({ droppedActions: [] }),

  initialize: async () => {
    // Load persisted queue
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        set({ queue: JSON.parse(stored) });
      }
    } catch (error) {
      console.warn('Failed to load offline queue', error);
    }

    netInfoUnsubscribe?.();
    netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !get().isOnline;
      const isNowOnline = !!state.isConnected && !!state.isInternetReachable;
      set({ isOnline: isNowOnline });

      if (wasOffline && isNowOnline && get().queue.length > 0) {
        get().processQueue();
      }
    });
  },

  enqueue: async (action) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
    };

    const newQueue = [...get().queue, queuedAction];
    set({ queue: newQueue });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.warn('Failed to persist offline queue', error);
    }

    // Try to process immediately if online
    if (get().isOnline) {
      get().processQueue();
    }
  },

  processQueue: async () => {
    if (get().isSyncing || !get().isOnline || get().queue.length === 0) return;
    set({ isSyncing: true });

    const queue = [...get().queue];
    const failed: QueuedAction[] = [];
    const dropped: DroppedAction[] = [];

    for (const action of queue) {
      try {
        const client = api;

        if (action.method === 'POST') {
          await client.post(action.endpoint, action.payload);
        } else if (action.method === 'PATCH') {
          await client.patch(action.endpoint, action.payload);
        } else if (action.method === 'DELETE') {
          await client.delete(action.endpoint);
        }
      } catch (error: any) {
        if (action.retryCount < action.maxRetries) {
          failed.push({ ...action, retryCount: action.retryCount + 1 });
        } else {
          // Track permanently dropped actions so the UI can notify the user
          const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
          dropped.push({ action, error: errorMessage });
        }
      }
    }

    // Notify about dropped actions
    if (dropped.length > 0) {
      const prevDropped = get().droppedActions;
      const allDropped = [...prevDropped, ...dropped];
      set({ droppedActions: allDropped });

      const onDropCb = get().onDrop;
      if (onDropCb) {
        onDropCb(dropped);
      } else {
        console.warn(
          `[OfflineQueue] ${dropped.length} action(s) permanently failed:`,
          dropped.map((d) => `${d.action.type}: ${d.error}`).join(', ')
        );
      }
    }

    set({ queue: failed, isSyncing: false });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(failed));
    } catch (error) {
      console.warn('Failed to persist offline queue after sync', error);
    }
  },

  removeFromQueue: (id) => {
    const newQueue = get().queue.filter((a) => a.id !== id);
    set({ queue: newQueue });
    AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue)).catch((error) => {
      console.warn('Failed to persist offline queue after removal', error);
    });
  },

  clearQueue: () => {
    set({ queue: [] });
    AsyncStorage.removeItem(QUEUE_STORAGE_KEY).catch((error) => {
      console.warn('Failed to clear offline queue', error);
    });
  },
}));
