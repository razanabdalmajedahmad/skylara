import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Stack.Screen name="history" options={{ title: 'Transaction History' }} />
      <Stack.Screen name="buy-tickets" options={{ title: 'Buy Tickets' }} />
    </Stack>
  );
}
