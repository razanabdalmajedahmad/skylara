import '../styles/global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query';
import { useAuthStore } from '@/stores/auth';
import { useDropzoneStore } from '@/stores/dropzone';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineQueue } from '@/lib/offline-queue';
import ErrorBoundary from '@/components/ErrorBoundary';

function AppInitializer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchDropzones = useDropzoneStore((s) => s.fetchDropzones);
  const initializeQueue = useOfflineQueue((s) => s.initialize);

  // Register push notifications
  usePushNotifications();

  // Initialize offline queue
  useEffect(() => {
    initializeQueue();
  }, [initializeQueue]);

  // Fetch user's dropzones once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDropzones();
    }
  }, [isAuthenticated, fetchDropzones]);

  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) return null; // splash screen still visible

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AppInitializer />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="discover" />
              <Stack.Screen name="booking" />
              <Stack.Screen name="chat" />
              <Stack.Screen name="checkin" />
              <Stack.Screen name="logbook" />
              <Stack.Screen name="manifest" options={{ presentation: 'modal' }} />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="payments" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="safety" />
              <Stack.Screen name="social" />
              <Stack.Screen name="weather" />
              <Stack.Screen name="rig" />
              <Stack.Screen name="learn" />
              <Stack.Screen name="events" />
              <Stack.Screen name="careers" />
              <Stack.Screen name="stays" />
              <Stack.Screen name="coach" />
              <Stack.Screen name="ops" />
              <Stack.Screen name="manager" />
            </Stack>
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
