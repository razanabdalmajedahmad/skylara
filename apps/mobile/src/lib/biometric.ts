import { Platform } from 'react-native';
import * as SecureStore from '@/lib/secure-store';

// expo-local-authentication is native-only; load dynamically to avoid web crashes.
let LocalAuthentication: any = null;

try {
  if (Platform.OS !== 'web') {
    LocalAuthentication = require('expo-local-authentication');
  }
} catch {
  // Package not installed — biometric auth will be unavailable
}

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  if (!LocalAuthentication) return false;
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricType(): Promise<string> {
  if (!LocalAuthentication) return 'Biometric';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  } catch {
    return 'Biometric';
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Silently fail if secure store unavailable
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!LocalAuthentication) return false;
  try {
    const biometricType = await getBiometricType();
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock SkyLara with ${biometricType}`,
      cancelLabel: 'Use Password',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });
    return result.success;
  } catch {
    return false;
  }
}
