import { API_BASE_URL } from './constants';

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') localStorage.setItem('auth_token', token);
};

export const clearAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

interface FetchOptions extends RequestInit {
  data?: Record<string, any>;
  skipAuth?: boolean;
}

export const apiFetch = async <T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const { data, skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const body = data ? JSON.stringify(data) : undefined;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  let responseData: any;
  try {
    responseData = isJson ? await response.json() : await response.text();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const errorMessage = responseData?.message || responseData?.error || response.statusText;
    const errorCode = responseData?.code || 'UNKNOWN_ERROR';
    throw new APIError(response.status, errorCode, errorMessage);
  }

  return responseData as T;
};

export const apiGet = <T = any>(endpoint: string, options?: FetchOptions) =>
  apiFetch<T>(endpoint, { ...options, method: 'GET' });

export const apiPost = <T = any>(
  endpoint: string,
  data?: Record<string, any>,
  options?: FetchOptions
) => apiFetch<T>(endpoint, { ...options, method: 'POST', data });

export const apiPut = <T = any>(
  endpoint: string,
  data?: Record<string, any>,
  options?: FetchOptions
) => apiFetch<T>(endpoint, { ...options, method: 'PUT', data });

export const apiPatch = <T = any>(
  endpoint: string,
  data?: Record<string, any>,
  options?: FetchOptions
) => apiFetch<T>(endpoint, { ...options, method: 'PATCH', data });

export const apiDelete = <T = any>(endpoint: string, options?: FetchOptions) =>
  apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
