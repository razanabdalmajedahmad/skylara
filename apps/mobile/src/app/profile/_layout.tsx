import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="license" options={{ title: 'License & Skills' }} />
      <Stack.Screen name="documents" options={{ title: 'My Documents' }} />
      <Stack.Screen name="gear" options={{ title: 'Gear Locker' }} />
      <Stack.Screen name="gear-detail" options={{ title: 'Gear Detail' }} />
      <Stack.Screen name="waivers" options={{ title: 'Waivers' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
