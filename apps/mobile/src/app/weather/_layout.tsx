import { Stack } from 'expo-router';

export default function WeatherLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Weather' }} />
    </Stack>
  );
}
