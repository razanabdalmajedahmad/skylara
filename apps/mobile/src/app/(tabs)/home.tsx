import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useDropzoneStore } from '@/stores/dropzone';
import { useLoads } from '@/hooks/useLoads';
import { useWallet } from '@/hooks/useWallet';
import { useWeather } from '@/hooks/useWeather';
import { useRealtimeLoads } from '@/hooks/useRealtimeLoads';
import { useRealtimeWeather } from '@/hooks/useRealtimeWeather';
import { useRealtimeCheckins } from '@/hooks/useRealtimeCheckins';
import { useNotificationStore } from '@/stores/notifications';
import CheckInToggle from '@/components/CheckInToggle';
import WeatherWidget from '@/components/WeatherWidget';
import LoadCard from '@/components/LoadCard';
import {
  SLCard,
  SLIcon,
  SLEmptyState,
  SLAvatar,
  SLBottomSheet,
  SLButton,
} from '@/components/ui';
import { SLSkeletonStats, SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';
import type { IconName } from '@/components/ui/SLIcon';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeDz, dropzones, setActiveDz } = useDropzoneStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [dzPickerVisible, setDzPickerVisible] = React.useState(false);

  const { data: loads, isLoading: loadsLoading, refetch: refetchLoads } = useLoads({
    status: 'FILLING,LOCKED,BOARDING',
  });
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const { data: weather, refetch: refetchWeather } = useWeather();

  useRealtimeLoads();
  useRealtimeWeather();
  useRealtimeCheckins();

  const setupRealtimeListeners = useNotificationStore((s) => s.setupRealtimeListeners);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLoads(), refetchWallet(), refetchWeather()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchLoads, refetchWallet, refetchWeather]);

  useEffect(() => {
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [setupRealtimeListeners]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchLoads();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchLoads]);

  const upcomingLoad = loads && loads.length > 0 ? loads[0] : null;

  const actions: { icon: IconName; label: string; route: string }[] = [
    { icon: 'map-pin', label: 'Discover DZs', route: '/discover' },
    { icon: 'calendar', label: 'Events & Camps', route: '/events' },
    { icon: 'clipboard-list', label: 'Load Builder', route: '/manifest/load-builder' },
    { icon: 'bar-chart', label: 'My Loads', route: '/manifest/my-loads' },
    { icon: 'history', label: 'Transactions', route: '/payments/history' },
    { icon: 'siren', label: 'DZ Emergency', route: '/safety/emergency' },
    { icon: 'trophy', label: 'Leaderboard', route: '/social/leaderboard' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing[8] }}
      showsVerticalScrollIndicator={false}
      {...(Platform.OS !== 'web'
        ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
        : {})}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[100],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <SLAvatar
            firstName={user?.firstName}
            lastName={user?.lastName}
            uri={user?.profile?.avatar ?? user?.avatarUrl}
            size="md"
          />
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {user?.firstName || 'Jumper'}
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {activeDz?.name || 'No DZ Selected'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SLIcon name="bell" size="lg" color={colors.text.secondary} />
          </Pressable>
          <CheckInToggle />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
        {/* Dropzone Selector */}
        <Pressable
          onPress={() => setDzPickerVisible(true)}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            marginBottom: spacing[6],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: 2, fontWeight: typography.fontWeight.semibold }}>
              ACTIVE DROPZONE
            </Text>
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              {activeDz?.name || 'Select a DZ'}
            </Text>
          </View>
          <SLIcon name="chevron-down" size="md" color={colors.text.tertiary} />
        </Pressable>

        {/* Stats Cards */}
        {walletLoading ? (
          <SLSkeletonStats />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing[4], marginBottom: spacing[6] }}>
            {/* Balance Card */}
            <SLCard padding="md" shadow="sm" style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name="wallet" size="sm" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  BALANCE
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                {wallet?.currency === 'AED' ? '\u062F.\u0625' : wallet?.currency === 'EUR' ? '\u20AC' : '$'}{' '}
                {((wallet?.balanceCents || 0) / 100).toFixed(0)}
              </Text>
            </SLCard>

            {/* Tickets Card */}
            <SLCard padding="md" shadow="sm" style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name="ticket" size="sm" color={colors.brand.secondary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  TICKETS
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.accent.violet }}>
                {wallet?.jumpTickets || 0}
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[0.5] }}>
                available
              </Text>
            </SLCard>
          </View>
        )}

        {/* Weather Widget */}
        {weather && <WeatherWidget weather={weather} />}

        {/* Upcoming Load Card */}
        <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              UPCOMING LOAD
            </Text>
            <Pressable
              onPress={() => refetchLoads()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <SLIcon name="refresh" size="sm" color={colors.text.tertiary} />
            </Pressable>
          </View>

          {loadsLoading ? (
            <SLSkeletonCard height={80} />
          ) : upcomingLoad ? (
            <LoadCard
              load={upcomingLoad}
              onPress={() => router.push(`/manifest/load-detail?loadId=${upcomingLoad.id}`)}
            />
          ) : (
            <SLEmptyState
              icon="plane"
              title="No Upcoming Load"
              description="Check back soon for available jumps"
            />
          )}
        </SLCard>

        {/* Quick Actions Grid */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[4] }}>
          QUICK ACTIONS
        </Text>
        <View style={{ gap: spacing[3] }}>
          {Array.from({ length: Math.ceil(actions.length / 3) }, (_, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: 'row', gap: spacing[3] }}>
              {actions.slice(rowIndex * 3, rowIndex * 3 + 3).map((action) => (
                <ActionTile
                  key={action.label}
                  icon={action.icon}
                  label={action.label}
                  onPress={() => router.push(action.route as any)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Dropzone Picker Bottom Sheet */}
      <SLBottomSheet
        visible={dzPickerVisible}
        onClose={() => setDzPickerVisible(false)}
        title="Select Dropzone"
      >
        <FlatList
          data={dropzones}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setActiveDz(item);
                setDzPickerVisible(false);
              }}
              style={{
                paddingVertical: spacing[4],
                paddingHorizontal: spacing[4],
                borderBottomWidth: 1,
                borderBottomColor: colors.gray[100],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: activeDz?.id === item.id ? colors.sky[50] : 'transparent',
                borderRadius: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="map-pin" size="sm" color={activeDz?.id === item.id ? colors.brand.primary : colors.text.tertiary} />
                <View>
                  <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {item.location ?? item.icaoCode ?? ''}
                  </Text>
                </View>
              </View>
              {activeDz?.id === item.id && (
                <SLIcon name="check" size="md" color={colors.brand.primary} />
              )}
            </Pressable>
          )}
        />

        <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
          <SLButton
            label="Discover More Dropzones"
            onPress={() => {
              setDzPickerVisible(false);
              router.push('/discover');
            }}
            variant="outline"
            fullWidth
            iconLeft="search"
          />
          <SLButton
            label="Close"
            onPress={() => setDzPickerVisible(false)}
            variant="ghost"
            fullWidth
          />
        </View>
      </SLBottomSheet>
    </ScrollView>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
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
      <SLIcon name={icon} size="lg" color={colors.brand.primary} />
      <Text
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginTop: spacing[2],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
