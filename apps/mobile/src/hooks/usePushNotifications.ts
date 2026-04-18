import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setBadgeCount,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';

// expo-notifications is native-only; load dynamically.
let Notifications: any = null;

try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
  }
} catch {
  // Package not installed
}

export function usePushNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { fetchNotifications, unreadCount } = useNotificationStore();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!isAuthenticated || !Notifications) return;

    // Register for push notifications
    registerForPushNotifications();

    // Listen for notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((_notification: any) => {
      // Refresh notification list
      fetchNotifications();
    });

    // Listen for user tapping on a notification
    responseListener.current = addNotificationResponseListener((response: any) => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data?.type === 'LOAD_BOARDING' || data?.type === 'LOAD_READY') {
        router.push(`/manifest/load-detail?loadId=${data.loadId}`);
      } else if (data?.type === 'EMERGENCY_ALERT') {
        router.push('/safety/emergency');
      } else if (data?.type === 'WEATHER_HOLD' || data?.type === 'WEATHER_WARNING') {
        router.push('/weather');
      } else if (data?.type === 'PAYMENT_RECEIVED' || data?.type === 'PAYMENT_FAILED') {
        router.push('/payments/wallet');
      } else if (data?.type === 'CHAT_MESSAGE') {
        router.push(`/chat/${data.channelId}`);
      }

      // Refresh notifications
      fetchNotifications();
    });

    return () => {
      if (notificationListener.current && Notifications) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && Notifications) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, fetchNotifications, router]);

  // Update badge count when unread changes
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);
}
