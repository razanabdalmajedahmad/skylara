import { Platform } from 'react-native';
import { api } from './api';

// expo-notifications and expo-device are native-only; load dynamically for web safety.
let Notifications: any = null;
let Device: any = null;

try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  }
} catch {
  // Packages not installed — push notifications will be unavailable
}

// Configure how notifications appear when app is in foreground (native only)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });
  const pushToken = tokenData.data;

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
    });

    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#EF4444',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('loads', {
      name: 'Load Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
    });

    await Notifications.setNotificationChannelAsync('weather', {
      name: 'Weather Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#F59E0B',
    });
  }

  // Register token with backend
  try {
    await api.post('/jumpers/me/push-token', {
      token: pushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName,
    });
  } catch (error) {
    console.error('Failed to register push token with server:', error);
  }

  return pushToken;
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: any) => void
) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function setBadgeCount(count: number) {
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(0);
}
