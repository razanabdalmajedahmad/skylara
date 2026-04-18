import { Platform } from 'react-native';

// Cross-platform secure storage wrapper
// Uses expo-secure-store on native, localStorage on web
const isWeb = Platform.OS === 'web';

let NativeSecureStore: typeof import('expo-secure-store') | null = null;
if (!isWeb) {
  try {
    NativeSecureStore = require('expo-secure-store');
  } catch {
    // Fallback if expo-secure-store is not available
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return NativeSecureStore?.getItemAsync(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage might be full or disabled
    }
    return;
  }
  await NativeSecureStore?.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    return;
  }
  await NativeSecureStore?.deleteItemAsync(key);
}
