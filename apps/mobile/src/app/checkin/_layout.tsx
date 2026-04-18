import { Stack } from 'expo-router';

export default function CheckinLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="scan" options={{ title: 'QR Check-In' }} />
    </Stack>
  );
}
