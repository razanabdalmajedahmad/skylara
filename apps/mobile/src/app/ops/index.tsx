import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWeather } from '@/hooks/useWeather';
import { useDropzoneStore } from '@/stores/dropzone';
import {
  SLHeader,
  SLCard,
  SLIcon,
  SLEmptyState,
  SLStatusBadge,
} from '@/components/ui';
import { SLSkeletonStats, SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';
import type { IconName } from '@/components/ui/SLIcon';

interface DashboardStats {
  activeLoads: number;
  checkinsToday: number;
  queueLength: number;
  aircraftAvailable: number;
  aircraftTotal: number;
  loads: {
    id: string;
    loadNumber: number;
    status: string;
    filledSlots: number;
    totalSlots: number;
    aircraft: string;
  }[];
}

function useDashboardStats() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  return useQuery({
    queryKey: ['dashboard-stats', dzId],
    queryFn: async () => {
      const res = await api.get('/manifest/dashboard-stats');
      return res.data as DashboardStats;
    },
    enabled: !!dzId,
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export default function OpsDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const { data: weather, refetch: refetchWeather } = useWeather();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchWeather()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchWeather]);

  const weatherColor =
    weather?.status === 'GREEN'
      ? '#15803D'
      : weather?.status === 'YELLOW'
        ? '#A16207'
        : weather?.status === 'RED'
          ? '#B91C1C'
          : colors.text.secondary;

  const weatherBg =
    weather?.status === 'GREEN'
      ? '#DCFCE7'
      : weather?.status === 'YELLOW'
        ? '#FEF3C7'
        : weather?.status === 'RED'
          ? '#FEE2E2'
          : colors.gray[100];

  const actions: { icon: IconName; label: string; route: string }[] = [
    { icon: 'clipboard-list', label: 'Load Board', route: '/manifest/load-board' },
    { icon: 'scan', label: 'Check-in Scanner', route: '/checkin/scanner' },
    { icon: 'megaphone', label: 'Announcement', route: '/ops/announcements' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Operations" rightIcon="refresh" onRightPress={() => refetch()} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      >
        <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
          {/* Weather Banner */}
          {weather && (
            <View
              style={{
                backgroundColor: weatherBg,
                borderRadius: 12,
                padding: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[4],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <SLIcon name="cloud" size="md" color={weatherColor} />
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: weatherColor }}>
                  {weather.status || 'UNKNOWN'}
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize.sm, color: weatherColor }}>
                Wind: {weather.windSpeed} kts {weather.windDirection}
              </Text>
            </View>
          )}

          {/* KPI Cards */}
          {isLoading ? (
            <SLSkeletonStats />
          ) : isError ? (
            <SLCard padding="md" style={{ marginBottom: spacing[4] }}>
              <SLEmptyState icon="alert-triangle" title="Failed to load stats" description="Pull down to retry" />
            </SLCard>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] }}>
              <KpiCard icon="plane" label="Active Loads" value={stats?.activeLoads ?? 0} color={colors.brand.primary} />
              <KpiCard icon="users" label="Checked In" value={stats?.checkinsToday ?? 0} color={colors.brand.secondary} />
              <KpiCard icon="list" label="Queue" value={stats?.queueLength ?? 0} color="#A16207" />
              <KpiCard
                icon="plane"
                label="Aircraft"
                value={`${stats?.aircraftAvailable ?? 0}/${stats?.aircraftTotal ?? 0}`}
                color="#15803D"
              />
            </View>
          )}

          {/* Active Loads Summary */}
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
            ACTIVE LOADS
          </Text>
          {isLoading ? (
            <SLSkeletonCard />
          ) : !stats?.loads?.length ? (
            <SLCard padding="md" style={{ marginBottom: spacing[4] }}>
              <SLEmptyState icon="plane" title="No Active Loads" description="No loads currently active" />
            </SLCard>
          ) : (
            <View style={{ gap: spacing[2], marginBottom: spacing[6] }}>
              {stats.loads.map((load) => (
                <SLCard key={load.id} padding="sm" onPress={() => router.push(`/manifest/load-detail?loadId=${load.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                      <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                        #{load.loadNumber}
                      </Text>
                      <SLStatusBadge status={load.status} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        {load.filledSlots}/{load.totalSlots}
                      </Text>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{load.aircraft}</Text>
                    </View>
                  </View>
                </SLCard>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
            QUICK ACTIONS
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => router.push(a.route as any)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? colors.gray[100] : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: spacing[4],
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <SLIcon name={a.icon} size="lg" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, textAlign: 'center', marginTop: spacing[2] }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function KpiCard({ icon, label, value, color }: { icon: IconName; label: string; value: number | string; color: string }) {
  return (
    <SLCard padding="sm" style={{ flex: 1, minWidth: '45%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
        <SLIcon name={icon} size="sm" color={color} />
        <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        {value}
      </Text>
    </SLCard>
  );
}
