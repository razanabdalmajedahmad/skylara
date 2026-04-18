import { Platform } from 'react-native';
import { api } from './api';
import * as SecureStore from '@/lib/secure-store';

// OAuth is only available when expo-auth-session and expo-web-browser are installed.
// This module provides safe stubs that won't crash the app on web or when packages are missing.

let AuthSession: any = null;
let WebBrowser: any = null;

try {
  if (Platform.OS !== 'web') {
    AuthSession = require('expo-auth-session');
    WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();
  }
} catch {
  // Packages not installed — OAuth will be unavailable
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

// Google OAuth hook
export function useGoogleAuth() {
  // Return a no-op when auth session is unavailable
  if (!AuthSession) {
    return {
      request: null,
      response: null,
      promptAsync: async () => ({ type: 'dismiss' as const }),
    };
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'skylara' });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    }
  );

  return { request, response, promptAsync };
}

// Exchange OAuth code with our backend
export async function exchangeOAuthCode(
  provider: 'google' | 'apple',
  code: string,
  redirectUri: string
) {
  const { data } = await api.post('/auth/oauth/exchange', {
    provider,
    code,
    redirectUri,
  });
  await SecureStore.setItemAsync('access_token', data.accessToken);
  await SecureStore.setItemAsync('refresh_token', data.refreshToken);
  return data;
}

// Apple Sign In (uses expo-apple-authentication on iOS)
export async function signInWithApple() {
  try {
    const AppleAuthentication = await import('expo-apple-authentication');

    const credential = await AppleAuthentication.default.signInAsync({
      requestedScopes: [
        AppleAuthentication.default.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.default.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { data } = await api.post('/auth/oauth/apple', {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      fullName: credential.fullName,
      email: credential.email,
    });

    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    return data;
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      throw new Error('Sign in cancelled');
    }
    throw error;
  }
}
