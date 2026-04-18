import { create } from 'zustand';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface AppNotification {
  id: number;
  type: string;
  channel: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  setupRealtimeListeners: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/notifications');
      const unread = data.filter((n: AppNotification) => n.status !== 'READ').length;
      set({ notifications: data, unreadCount: unread, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {}
  },

  markAllAsRead: async () => {
    const unread = get().notifications.filter((n) => n.status !== 'READ');
    await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`)));
    set((s) => ({
      notifications: s.notifications.map((n) => ({
        ...n,
        status: 'READ' as const,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  setupRealtimeListeners: () => {
    const socket = getSocket();

    const handleNotification = (payload: AppNotification) => {
      get().addNotification(payload);
    };

    const handleLoadUpdate = (payload: any) => {
      // Synthetic notification for load status changes
      if (payload.type === 'load.status_changed') {
        get().addNotification({
          id: Date.now(),
          type: 'LOAD_STATUS',
          channel: 'IN_APP',
          title: `Load ${payload.loadNumber} — ${payload.toStatus}`,
          body: payload.message || `Load status changed to ${payload.toStatus}`,
          data: payload,
          status: 'DELIVERED',
          createdAt: new Date().toISOString(),
        });
      }
    };

    const handleEmergency = (payload: any) => {
      get().addNotification({
        id: Date.now(),
        type: 'EMERGENCY_ALERT',
        channel: 'IN_APP',
        title: '🚨 DZ EMERGENCY',
        body: payload.message || 'Emergency has been activated at the dropzone',
        data: payload,
        status: 'DELIVERED',
        createdAt: new Date().toISOString(),
      });
    };

    const handleWeatherHold = (payload: any) => {
      get().addNotification({
        id: Date.now(),
        type: 'WEATHER_HOLD',
        channel: 'IN_APP',
        title: 'Weather Hold',
        body: payload.reason || 'Weather hold has been activated',
        data: payload,
        status: 'DELIVERED',
        createdAt: new Date().toISOString(),
      });
    };

    socket.on('notification', handleNotification);
    socket.on('load:update', handleLoadUpdate);
    socket.on('emergency:activated', handleEmergency);
    socket.on('weather:hold', handleWeatherHold);

    // Return cleanup function
    return () => {
      socket.off('notification', handleNotification);
      socket.off('load:update', handleLoadUpdate);
      socket.off('emergency:activated', handleEmergency);
      socket.off('weather:hold', handleWeatherHold);
    };
  },
}));
