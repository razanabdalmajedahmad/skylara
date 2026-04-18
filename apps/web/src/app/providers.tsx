'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { WebSocketProvider } from '@/hooks/useWebSocket';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { ToastProvider } from '@/components/Toast';
import { LocaleProvider } from '@/contexts/LocaleContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LocaleProvider>
            <BrandingProvider>
              <ToastProvider>
                <WebSocketProvider>{children}</WebSocketProvider>
              </ToastProvider>
            </BrandingProvider>
          </LocaleProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
