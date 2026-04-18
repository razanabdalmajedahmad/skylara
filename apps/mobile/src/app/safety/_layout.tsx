import { Stack } from 'expo-router';

export default function SafetyLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="emergency" options={{ title: 'DZ Emergency' }} />
      <Stack.Screen name="report-incident" options={{ title: 'Report Incident' }} />
    </Stack>
  );
}
