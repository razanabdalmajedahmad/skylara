import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="new" options={{ title: 'Book a Jump' }} />
      <Stack.Screen name="[id]" options={{ title: 'Booking Details' }} />
      <Stack.Screen name="packages" options={{ title: 'Jump Packages' }} />
    </Stack>
  );
}
