import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLogbook, useLogbookStats, type LogbookEntry } from '@/hooks/useLogbook';
import { SLCard, SLIcon, SLEmptyState, SLBadge } from '@/components/ui';
import { SLSkeletonCard, SLSkeletonStats } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';

const JUMP_TYPE_FILTERS = ['All', 'Belly', 'Freefly', 'Angle', 'Wingsuit', 'Tracking', 'Hop & Pop', 'CRW'] as const;

const JUMP_TYPE_BADGES: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  FREEFLY: { variant: 'info', label: 'Freefly' },
  BELLY: { variant: 'success', label: 'Belly' },
  ANGLE: { variant: 'warning', label: 'Angle' },
  WINGSUIT: { variant: 'danger', label: 'Wingsuit' },
  TRACKING: { variant: 'info', label: 'Tracking' },
  HOP_N_POP: { variant: 'warning', label: 'Hop & Pop' },
  CRW: { variant: 'danger', label: 'CRW' },
  TANDEM: { variant: 'info', label: 'Tandem' },
  AFF: { variant: 'success', label: 'AFF' },
};

const FILTER_TO_TYPE: Record<string, string> = {
  'Belly': 'BELLY',
  'Freefly': 'FREEFLY',
  'Angle': 'ANGLE',
  'Wingsuit': 'WINGSUIT',
  'Tracking': 'TRACKING',
  'Hop & Pop': 'HOP_N_POP',
  'CRW': 'CRW',
};

function formatFreefallTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateStreak(entries: LogbookEntry[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].createdAt);
    const curr = new Date(sorted[i].createdAt);
    const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function LogbookScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const { data: logbookData, isLoading, refetch } = useLogbook({ limit: 50 });
  const { data: stats } = useLogbookStats();

  const entries = useMemo<LogbookEntry[]>(() => {
    if (!logbookData?.entries) return [];
    return logbookData.entries.map((entry) => ({
      ...entry,
      dropzoneName: entry.dropzoneName || 'Unknown DZ',
    }));
  }, [logbookData?.entries]);

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'All') return entries;
    const mappedType = FILTER_TO_TYPE[activeFilter];
    if (!mappedType) return entries;
    return entries.filter((e) => e.jumpType === mappedType);
  }, [entries, activeFilter]);

  const streak = useMemo(() => calculateStreak(entries), [entries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const statCards: { icon: IconName; label: string; value: string; color: string }[] = stats
    ? [
        { icon: 'plane', label: 'Total Jumps', value: String(stats.totalJumps), color: colors.brand.primary },
        { icon: 'clock', label: 'Freefall Time', value: formatFreefallTime(stats.totalFreefallTime), color: colors.status.inFlight },
        { icon: 'trending-up', label: 'Highest Alt', value: `${stats.highestAltitude.toLocaleString()} ft`, color: colors.accent.emerald },
        { icon: 'flame', label: 'Jump Streak', value: `${streak} jumps`, color: colors.accent.orange },
      ]
    : [];

  const renderHeader = () => (
    <View>
      {/* Page Title */}
      <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[3] }}>
        <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
          Logbook
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[1] }}>
          Track your jump history
        </Text>
      </View>

      {/* Stats Cards */}
      {stats ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[6], paddingBottom: spacing[4], gap: spacing[3] }}
        >
          {statCards.map((stat) => (
            <SLCard key={stat.label} padding="md" shadow="sm" style={{ minWidth: 140 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <SLIcon name={stat.icon} size="sm" color={stat.color} />
                <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary }}>
                  {stat.label.toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                {stat.value}
              </Text>
            </SLCard>
          ))}
        </ScrollView>
      ) : isLoading ? (
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[4] }}>
          <SLSkeletonStats />
        </View>
      ) : null}

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[6], paddingBottom: spacing[3], gap: spacing[2] }}
      >
        {JUMP_TYPE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: radii.full,
                backgroundColor: isActive ? colors.brand.primary : colors.gray[100],
              }}
            >
              <Text
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: isActive ? colors.text.inverse : colors.text.secondary,
                }}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Results Count */}
      <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[3] }}>
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.semibold }}>
          {filteredEntries.length} {filteredEntries.length === 1 ? 'JUMP' : 'JUMPS'}
        </Text>
      </View>
    </View>
  );

  const renderJumpRow = ({ item }: { item: LogbookEntry }) => {
    const jt = item.jumpType;
    const badge =
      (jt && JUMP_TYPE_BADGES[jt]) ||
      { variant: 'neutral' as const, label: jt ?? 'Jump' };

    return (
      <Pressable onPress={() => router.push(`/logbook/${item.id}`)}>
        <SLCard padding="md" shadow="sm" style={{ marginHorizontal: spacing[4], marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.sky[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                  #{item.jumpNumber}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Jump #{item.jumpNumber}
                </Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
            <SLBadge label={badge.label} variant={badge.variant} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: spacing[1] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <SLIcon name="arrow-up" size="xs" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                {item.altitude != null ? `${item.altitude.toLocaleString()} ft` : '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <SLIcon name="clock" size="xs" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                {item.freefallTime}s
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }} numberOfLines={1}>
                {item.dropzoneName}
              </Text>
            </View>
          </View>
        </SLCard>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {renderHeader()}
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJumpRow}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8] }}>
            <SLEmptyState
              icon="book-open"
              title="No Jumps Logged"
              description="Start recording your skydives to track your progress, freefall time, and achievements."
              actionLabel="Log Your First Jump"
              onAction={() => router.push('/logbook/add')}
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredEntries.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      />

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/logbook/add')}
        style={{
          position: 'absolute',
          bottom: spacing[6],
          right: spacing[6],
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...({ boxShadow: '0px 4px 12px rgba(14, 165, 233, 0.4)' } as any),
        }}
      >
        <SLIcon name="plus" size="lg" color={colors.text.inverse} />
      </Pressable>
    </View>
  );
}
