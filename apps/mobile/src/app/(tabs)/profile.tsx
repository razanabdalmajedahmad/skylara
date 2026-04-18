import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { SLAvatar, SLIcon } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface ProfileTile {
  id: string;
  icon: IconName;
  label: string;
  route: string;
  iconColor?: string;
}

const profileTiles: ProfileTile[] = [
  { id: '1', icon: 'user', label: 'Personal Details', route: '/profile/edit', iconColor: colors.sky[500] },
  { id: '2', icon: 'award', label: 'License & Skills', route: '/profile/license', iconColor: colors.status.inFlight },
  { id: '3', icon: 'package', label: 'Gear Locker', route: '/profile/gear', iconColor: colors.accent.emerald },
  { id: '4', icon: 'file-text', label: 'Documents', route: '/profile/documents', iconColor: colors.brand.warning },
  { id: '5', icon: 'wallet', label: 'Transactions', route: '/payments/history', iconColor: colors.brand.secondary },
  { id: '6', icon: 'pen-tool', label: 'Waivers', route: '/profile/waivers', iconColor: colors.sky[400] },
  { id: '7', icon: 'bell', label: 'Notifications', route: '/notifications', iconColor: colors.brand.danger },
  { id: '8', icon: 'calendar', label: 'Bookings', route: '/booking', iconColor: colors.accent.orange },
  { id: '9', icon: 'qr-code', label: 'QR Check-In', route: '/checkin/scan', iconColor: colors.accent.violet },
  { id: '10', icon: 'settings', label: 'Settings', route: '/profile/settings', iconColor: colors.brand.success },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Avatar */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[8],
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[100],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <SLAvatar
            firstName={user?.firstName}
            lastName={user?.lastName}
            uri={user?.avatarUrl}
            size="lg"
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}
            >
              {user?.firstName} {user?.lastName}
            </Text>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                marginTop: spacing[1],
              }}
            >
              {user?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Tiles Grid */}
      <View style={{ padding: spacing[6] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          {profileTiles.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={() => router.push(tile.route as any)}
              style={({ pressed }) => ({
                width: '47%',
                flexGrow: 1,
                backgroundColor: pressed ? colors.gray[100] : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: 1,
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${tile.iconColor}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[3],
                }}
              >
                <SLIcon name={tile.icon} size="lg" color={tile.iconColor || colors.brand.primary} />
              </View>
              <Text
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  textAlign: 'center',
                }}
              >
                {tile.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => ({
            marginTop: spacing[4],
            backgroundColor: pressed ? colors.tint.danger.border : colors.tint.danger.bg,
            borderWidth: 1,
            borderColor: colors.tint.danger.border,
            borderRadius: 12,
            padding: spacing[4],
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing[2],
          })}
        >
          <SLIcon name="log-out" size="md" color={colors.brand.danger} />
          <Text
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.brand.danger,
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
