import React, { useCallback, useMemo, useState } from 'react';
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
import {
  SLCard,
  SLIcon,
  SLEmptyState,
  SLBadge,
} from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography, radii } from '@/theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function CoachCalendar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const startDate = formatISO(weekDates[0]);
  const endDate = formatISO(weekDates[6]);

  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useCoachSessions({ startDate, endDate });

  const selectedISO = formatISO(selectedDate);
  const daySessions = useMemo(
    () => sessions.filter((s) => s.scheduledAt.startsWith(selectedISO)),
    [sessions, selectedISO],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const shiftWeek = (dir: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir * 7);
    setSelectedDate(next);
  };

  const todayISO = formatISO(new Date());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Calendar
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Week Navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={() => shiftWeek(-1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="md" color={colors.text.secondary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
            {weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} &ndash;{' '}
            {weekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
          <Pressable onPress={() => shiftWeek(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-right" size="md" color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* Day Selector */}
        <View style={{ flexDirection: 'row', gap: spacing[1] }}>
          {weekDates.map((date, idx) => {
            const iso = formatISO(date);
            const isSelected = iso === selectedISO;
            const isToday = iso === todayISO;
            const sessionCount = sessions.filter((s) => s.scheduledAt.startsWith(iso)).length;
            return (
              <Pressable
                key={iso}
                onPress={() => setSelectedDate(date)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing[2],
                  borderRadius: radii.lg,
                  backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: isSelected ? colors.text.inverse : colors.text.tertiary,
                  }}
                >
                  {DAY_LABELS[idx]}
                </Text>
                <Text
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.bold,
                    color: isSelected ? colors.text.inverse : isToday ? colors.brand.primary : colors.text.primary,
                    marginTop: 2,
                  }}
                >
                  {date.getDate()}
                </Text>
                {sessionCount > 0 && !isSelected && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.primary, marginTop: 2 }} />
                )}
                {sessionCount > 0 && isSelected && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text.inverse, marginTop: 2 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sessions for selected day */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      >
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <SLSkeletonCard />
            <SLSkeletonCard />
          </View>
        ) : isError ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <SLEmptyState
              icon="alert-triangle"
              title="Failed to load sessions"
              description="Pull down to retry"
            />
          </View>
        ) : daySessions.length === 0 ? (
          <SLEmptyState
            icon="calendar"
            title="No sessions"
            description="No sessions scheduled for this day"
          />
        ) : (
          <View style={{ gap: spacing[3] }}>
            {daySessions.map((session) => (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
                      <SLBadge
                        label={session.status}
                        variant={session.status === 'COMPLETED' ? 'success' : session.status === 'CANCELLED' ? 'error' : 'default'}
                      />
                    </View>
                  </View>
                  <SLIcon name="chevron-right" size="md" color={colors.text.tertiary} />
                </View>
              </SLCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
