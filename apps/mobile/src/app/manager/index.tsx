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
import { useDropzoneStore, type DropzoneState } from '@/stores/dropzone';
import {
  SLHeader,
  SLCard,
  SLIcon,
  SLBadge,
  SLEmptyState,
} from '@/components/ui';
import { SLSkeletonStats } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';
import type { IconName } from '@/components/ui/SLIcon';

interface ManagerStats {
  revenueToday: number;
  currency: string;
  loadsCompleted: number;
  jumpersTotal: number;
  staffOnDuty: number;
  coachUtilization: number;
  complianceAlerts: number;
}

function useManagerStats() {
  const dzId = useDropzoneStore((s: DropzoneState) => s.activeDz?.id);
  return useQuery({
    queryKey: ['manager-stats', dzId],
    queryFn: async () => {
      const [dashRes, usersRes] = await Promise.all([
        api.get('/manifest/dashboard-stats'),
        api.get('/users', { params: { limit: 20 } }),
      ]);
      const dash = dashRes.data as any;
      const users = usersRes.data as any;
      return {
        revenueToday: dash.revenueToday ?? 0,
        currency: dash.currency ?? 'USD',
        loadsCompleted: dash.loadsCompleted ?? 0,
        jumpersTotal: dash.jumpersTotal ?? 0,
        staffOnDuty: Array.isArray(users) ? users.filter((u: any) => u.isOnDuty).length : dash.staffOnDuty ?? 0,
        coachUtilization: dash.coachUtilization ?? 0,
        complianceAlerts: dash.complianceAlerts ?? 0,
      } as ManagerStats;
    },
    enabled: !!dzId,
    staleTime: 30000,
  });
}

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: stats, isLoading, isError, refetch } = useManagerStats();
  const { data: weather, refetch: refetchWeather } = useWeather();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetch(), refetchWeather()]); } finally { setRefreshing(false); }
  }, [refetch, refetchWeather]);

  const currencySymbol =
    stats?.currency === 'AED' ? '\u062F.\u0625'
      : stats?.currency === 'EUR' ? '\u20AC'
        : '$';

  const weatherHold = weather?.status === 'RED';

  const quickLinks: { icon: IconName; label: string; route: string }[] = [
    { icon: 'graduation-cap', label: 'Coach & instructor apps', route: '/manager/onboarding' },
    { icon: 'bar-chart', label: 'Reports', route: '/manager/reports' },
    { icon: 'users', label: 'Staff', route: '/manager/staff' },
    { icon: 'settings', label: 'Settings', route: '/settings' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Manager" rightIcon="refresh" onRightPress={() => refetch()} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      >
        <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
          {/* Weather Hold Banner */}
          {weatherHold && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 12,
                padding: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
                marginBottom: spacing[4],
              }}
            >
              <SLIcon name="alert-triangle" size="md" color="#B91C1C" />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: '#B91C1C', flex: 1 }}>
                WEATHER HOLD - Operations paused
              </Text>
            </View>
          )}

          {/* Primary Stats */}
          {isLoading ? (
            <SLSkeletonStats />
          ) : isError ? (
            <SLCard padding="md" style={{ marginBottom: spacing[4] }}>
              <SLEmptyState icon="alert-triangle" title="Failed to load stats" description="Pull down to retry" />
            </SLCard>
          ) : (
            <>
              {/* Revenue Card */}
              <SLCard padding="lg" shadow="md" style={{ marginBottom: spacing[4] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <SLIcon name="wallet" size="sm" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                    REVENUE TODAY
                  </Text>
                </View>
                <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                  {currencySymbol} {((stats?.revenueToday ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
              </SLCard>

              {/* KPI Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] }}>
                <StatCard icon="plane" label="Loads Done" value={stats?.loadsCompleted ?? 0} color="#15803D" />
                <StatCard icon="users" label="Jumpers" value={stats?.jumpersTotal ?? 0} color={colors.brand.secondary} />
                <StatCard icon="user" label="Staff On Duty" value={stats?.staffOnDuty ?? 0} color={colors.brand.primary} />
                <StatCard icon="trophy" label="Coach Util" value={`${stats?.coachUtilization ?? 0}%`} color="#A16207" />
              </View>

              {/* Compliance Alerts */}
              {(stats?.complianceAlerts ?? 0) > 0 && (
                <SLCard padding="md" style={{ marginBottom: spacing[4] }}>
                  <Pressable
                    onPress={() => router.push('/compliance/alerts' as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <SLIcon name="alert-triangle" size="md" color="#B91C1C" />
                      <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        Compliance Alerts
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <SLBadge label={String(stats?.complianceAlerts ?? 0)} variant="danger" size="md" />
                      <SLIcon name="chevron-right" size="sm" color={colors.text.tertiary} />
                    </View>
                  </Pressable>
                </SLCard>
              )}

              {/* Weather Status */}
              {weather && !weatherHold && (
                <SLCard padding="md" style={{ marginBottom: spacing[4] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <SLIcon name="cloud" size="md" color={colors.text.secondary} />
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        Weather
                      </Text>
                    </View>
                    <SLBadge
                      label={weather.status || 'OK'}
                      variant={weather.status === 'GREEN' ? 'success' : weather.status === 'YELLOW' ? 'warning' : 'neutral'}
                    />
                  </View>
                </SLCard>
              )}
            </>
          )}

          {/* Quick Links */}
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
            QUICK LINKS
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            {quickLinks.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => router.push(link.route as any)}
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
                <SLIcon name={link.icon} size="lg" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, textAlign: 'center', marginTop: spacing[2] }}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: IconName; label: string; value: number | string; color: string }) {
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
