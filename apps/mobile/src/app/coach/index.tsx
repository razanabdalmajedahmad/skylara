import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoachSessions } from '@/hooks/useCoachSessions';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SLCard,
  SLIcon,
  SLEmptyState,
  SLBadge,
} from '@/components/ui';
import { SLSkeletonStats, SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography, radii } from '@/theme';
import type { IconName } from '@/components/ui/SLIcon';

const today = () => new Date().toISOString().split('T')[0];

export default function CoachDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useCoachSessions({ date: today() });

  const {
    data: assignments = [],
    isLoading: assignLoading,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ['coach-assignments'],
    queryFn: async () => {
      const res = await api.get('/training/instructors/me/assignments');
      return res.data as any[];
    },
    staleTime: 60000,
  });

  const {
    data: upcomingSessions = [],
    refetch: refetchUpcoming,
  } = useCoachSessions({ status: 'SCHEDULED' });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchAssignments(), refetchUpcoming()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchAssignments, refetchUpcoming]);

  const actions: { icon: IconName; label: string; route: string }[] = [
    { icon: 'calendar', label: 'View Calendar', route: '/coach/calendar' },
    { icon: 'clipboard-list', label: 'My Sessions', route: '/coach/sessions' },
    { icon: 'users', label: 'Assigned Jumpers', route: '/coach/assigned' },
  ];

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <SLEmptyState
          icon="alert-triangle"
          title="Failed to load sessions"
          description="Pull down to retry or check your connection"
        />
        <Pressable
          onPress={() => refetch()}
          style={{
            marginTop: spacing[4],
            backgroundColor: colors.brand.primary,
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[3],
            borderRadius: radii.lg,
          }}
        >
          <Text style={{ color: colors.text.inverse, fontWeight: typography.fontWeight.semibold }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

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
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[4],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
          Coach Dashboard
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
        {/* Stats */}
        {isLoading || assignLoading ? (
          <SLSkeletonStats />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing[4], marginBottom: spacing[6] }}>
            <SLCard padding="md" shadow="sm" style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name="clipboard-list" size="sm" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  TODAY
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                {sessions.length}
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>sessions</Text>
            </SLCard>

            <SLCard padding="md" shadow="sm" style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name="calendar" size="sm" color={colors.brand.secondary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  UPCOMING
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.accent.violet }}>
                {upcomingSessions.length}
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>scheduled</Text>
            </SLCard>

            <SLCard padding="md" shadow="sm" style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name="users" size="sm" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  JUMPERS
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                {assignments.length}
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>assigned</Text>
            </SLCard>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[4] }}>
          QUICK ACTIONS
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[6] }}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route as any)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? colors.gray[100] : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <SLIcon name={action.icon} size="lg" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, textAlign: 'center', marginTop: spacing[2] }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Today's Schedule */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            TODAY&apos;S SCHEDULE
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="sm" color={colors.text.tertiary} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <SLSkeletonCard />
            <SLSkeletonCard />
          </View>
        ) : sessions.length === 0 ? (
          <SLEmptyState
            icon="calendar"
            title="No sessions today"
            description="Your schedule is clear for today"
          />
        ) : (
          <View style={{ gap: spacing[3] }}>
            {sessions.map((session) => (
              <SLCard key={session.id} padding="md" shadow="sm">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                        {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <SLBadge
                        label={session.type}
                        variant={session.type === 'AFF' ? 'warning' : session.type === 'TANDEM' ? 'info' : 'default'}
                      />
                    </View>
                    <Text style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
                      {session.student.firstName} {session.student.lastName}
                    </Text>
                  </View>
                  <SLIcon name="chevron-right" size="md" color={colors.text.tertiary} />
                </View>
              </SLCard>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
