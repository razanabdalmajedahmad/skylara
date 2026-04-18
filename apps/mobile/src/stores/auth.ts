import { create } from 'zustand';
import * as SecureStore from '@/lib/secure-store';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export interface User {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  /** API may send top-level avatar URL; prefer profile.avatar when both exist */
  avatarUrl?: string;
  /** Operational: whether the user is checked in at the active DZ (when provided by API) */
  checkedIn?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyProfile?: {
    bloodType?: string;
    allergies?: string;
    medications?: string;
    notes?: string;
  };
  roles: {
    role: string;
    dropzoneId?: number;
    organizationId?: number;
  }[];
  profile?: {
    avatar?: string;
    bio?: string;
    dateOfBirth?: string;
    weight?: number;
    nationality?: string;
    bloodType?: string;
    allergies?: string;
    medications?: string;
  };
  athlete?: {
    licenseLevel: string;
    totalJumps: number;
    lastJumpDate?: string;
    homeDropzoneId?: number;
    uspaId?: string;
    disciplines?: string[];
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        set({ isInitialized: true, isAuthenticated: false });
        return;
      }
      const { data } = await api.get('/jumpers/me');
      set({ user: data, isAuthenticated: true, isInitialized: true });
      await connectSocket();
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ isInitialized: true, isAuthenticated: false, user: null });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);

      const { data: user } = await api.get('/jumpers/me');
      set({ user, isAuthenticated: true, isLoading: false });
      await connectSocket();
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', registerData);
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);

      const { data: user } = await api.get('/jumpers/me');
      set({ user, isAuthenticated: true, isLoading: false });
      await connectSocket();
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    disconnectSocket();

    // Clear all cached query data so stale data doesn't persist
    queryClient.clear();

    // Clear dropzone store — import inline to avoid circular dep
    const { useDropzoneStore } = await import('@/stores/dropzone');
    useDropzoneStore.setState({ dropzones: [], activeDz: null, isLoading: false });

    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/jumpers/me');
      set({ user: data });
    } catch {}
  },
}));
