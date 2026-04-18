import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { tabBar } from '@/theme';
import { Home, Cloud, CalendarDays, User } from 'lucide-react-native';

export default function TabsLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBar.activeColor,
        tabBarInactiveTintColor: tabBar.inactiveColor,
        tabBarStyle: {
          borderTopColor: tabBar.borderColor,
          borderTopWidth: 1,
          backgroundColor: tabBar.backgroundColor,
          paddingBottom: tabBar.paddingBottom,
          paddingTop: tabBar.paddingTop,
          height: tabBar.height,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Weather',
          tabBarIcon: ({ color, size }) => (
            <Cloud size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* Hide old tabs from tab bar — screens still accessible via stack navigation */}
      <Tabs.Screen
        name="logbook"
        options={{
          href: null, // Hides from tab bar but keeps route accessible
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
