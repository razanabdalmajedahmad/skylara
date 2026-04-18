import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoachSessions, CoachSession } from '@/hooks/useCoachSessions';
import {
  SLCard,
  SLIcon,
  SLEmptyState,
  SLBadge,
} from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography, radii } from '@/theme';

type FilterTab = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

const FILTERS: { label: string; value: FilterTab }[] = [
  { label: 'Upcoming', value: 'SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <SLIcon
          key={star}
          name="star"
          size="sm"
          color={star <= rating ? colors.brand.secondary : colors.gray[200]}
        />
      ))}
    </View>
  );
}

export default function CoachSessions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('SCHEDULED');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useCoachSessions({ status: selectedFilter });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderSession = ({ item }: { item: CoachSession }) => (
    <Pressable
      onPress={() => router.push(`/coach/debrief?sessionId=${item.id}` as any)}
      style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[2] }}
    >
      <SLCard padding="md" shadow="sm">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
              <SLBadge
                label={item.type}
                variant={item.type === 'AFF' ? 'warning' : item.type === 'TANDEM' ? 'info' : 'default'}
              />
            </View>
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>
              {item.student.firstName} {item.student.lastName}
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {new Date(item.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' \u2022 '}
              {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.status === 'COMPLETED' && item.rating != null && (
              <View style={{ marginTop: spacing[2] }}>
                <StarRating rating={item.rating} />
              </View>
            )}
          </View>
          <SLIcon name="chevron-right" size="md" color={colors.text.tertiary} />
        </View>
      </SLCard>
    </Pressable>
  );

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
            Sessions
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {FILTERS.map(({ label, value }) => {
            const isActive = selectedFilter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSelectedFilter(value)}
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
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading && sessions.length === 0 ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="alert-triangle"
            title="Failed to load sessions"
            description="Pull down to retry"
          />
        </View>
      ) : sessions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="clipboard-list"
            title={`No ${selectedFilter.toLowerCase()} sessions`}
            description="Sessions will appear here when available"
          />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          contentContainerStyle={{ paddingVertical: spacing[2] }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
