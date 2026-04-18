import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from '@/lib/secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response envelope unwrapper
// The API returns { success, data, pagination? }. This interceptor extracts
// the inner `data` so callers receive the payload directly.
// Pagination metadata (when present) is preserved on response._pagination
// for hooks that need it (e.g. useLogbook).
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    if (
      body &&
      typeof body === 'object' &&
      'success' in body &&
      'data' in body
    ) {
      if (body.pagination) {
        (response as any)._pagination = body.pagination;
      }
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data: raw } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });
        // Raw axios bypasses the interceptor — unwrap { success, data } manually
        const tokens = raw?.data ?? raw;

        await SecureStore.setItemAsync('access_token', tokens.accessToken);
        if (tokens.refreshToken) {
          await SecureStore.setItemAsync('refresh_token', tokens.refreshToken);
        }

        processQueue(null, tokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Will be caught by auth store to redirect to login
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper for DZ-scoped endpoints
export const dzApi = (dzId: string | number) => ({
  get: <T = any>(path: string, config?: any) => api.get<T>(`/dz/${dzId}${path}`, config),
  post: <T = any>(path: string, data?: any, config?: any) => api.post<T>(`/dz/${dzId}${path}`, data, config),
  patch: <T = any>(path: string, data?: any, config?: any) => api.patch<T>(`/dz/${dzId}${path}`, data, config),
  delete: <T = any>(path: string, config?: any) => api.delete<T>(`/dz/${dzId}${path}`, config),
});

/**
 * Extract pagination metadata stored by the response interceptor.
 * Usage: `const pg = getPagination(response);`
 */
export function getPagination(
  response: any,
): { page: number; limit: number; total: number; totalPages: number } | null {
  return response?._pagination ?? null;
}
