import { Stack } from 'expo-router';

export default function SocialLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="whos-going" options={{ title: "Who's Going" }} />
    </Stack>
  );
}
