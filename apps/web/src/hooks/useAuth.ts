'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, createElement } from 'react';
import { apiPost, apiGet, setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api';
import { mapSessionUser, type SessionUser } from '@/lib/sessionUser';
import { trackEvent } from '@/lib/analytics';

export type User = SessionUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          // Same endpoint as mobile — normalized to SessionUser (Phase 4 parity)
          const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>('/jumpers/me');
          if (response.success && response.data) {
            setUser(mapSessionUser(response.data));
          } else {
            clearAuthToken();
          }
        } catch (error) {
          console.error('Failed to verify auth:', error);
          clearAuthToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiPost<{
        success: boolean;
        data: { user: Record<string, unknown>; accessToken: string; refreshToken: string };
        error?: string;
      }>('/auth/login', { email, password });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed');
      }

      setAuthToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }
      const u = mapSessionUser(response.data.user);
      setUser(u);
      trackEvent('auth_login', { method: 'password' });
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        throw new Error('Unable to connect to server. Please make sure the API is running.');
      }
      throw error;
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      const response = await apiPost<{
        success: boolean;
        data: { user: Record<string, unknown>; accessToken: string; refreshToken: string };
        error?: string;
      }>('/auth/register', data);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Registration failed');
      }

      setAuthToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }
      setUser(mapSessionUser(response.data.user));
      trackEvent('auth_register', {});
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthToken();
      setUser(null);
      trackEvent('auth_logout', {});
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
