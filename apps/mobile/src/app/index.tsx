import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

const DEV_PREVIEW = __DEV__ && Platform.OS === 'web';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated || DEV_PREVIEW) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/(auth)/login" />;
}
