import { Stack } from 'expo-router';
import { colors, typography } from '@/theme';

export default function ManifestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold },
      }}
    >
      <Stack.Screen name="load-board" options={{ title: 'Load Board' }} />
      <Stack.Screen name="load-detail" options={{ title: 'Load Detail' }} />
      <Stack.Screen name="load-builder" options={{ title: 'Load Builder' }} />
      <Stack.Screen
        name="select-load"
        options={{ title: 'Select Load', presentation: 'modal' }}
      />
      <Stack.Screen name="my-loads" options={{ title: 'My Loads' }} />
    </Stack>
  );
}
