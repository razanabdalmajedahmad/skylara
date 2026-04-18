import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBookings } from '@/hooks/useBookings';
import { SLCard, SLStatusBadge, SLIcon, SLEmptyState, SLButton } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

type FilterStatus = 'ALL' | 'UPCOMING' | 'PAST';

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'PAST', label: 'Past' },
];

export default function BookingsTabScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>('UPCOMING');
  const [refreshing, setRefreshing] = useState(false);

  const statusFilter = filter === 'UPCOMING'
    ? 'CONFIRMED,PENDING'
    : filter === 'PAST'
      ? 'COMPLETED,CANCELLED,NO_SHOW'
      : undefined;

  const { data: bookings, isLoading, refetch } = useBookings(statusFilter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderBooking = ({ item }: { item: any }) => (
    <SLCard
      padding="md"
      shadow="sm"
      onPress={() => router.push(`/booking/${item.id}`)}
      style={{ marginBottom: spacing[3] }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
            {item.packageName || item.jumpType || 'Jump Booking'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[1] }}>
            <SLIcon name="calendar" size="xs" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {formatDate(item.date || item.scheduledAt)}
            </Text>
          </View>
          {(item.scheduledAt || item.time) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[0.5] }}>
              <SLIcon name="clock" size="xs" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {formatTime(item.scheduledAt || item.time)}
              </Text>
            </View>
          )}
        </View>
        <SLStatusBadge status={item.status} />
      </View>

      {item.priceCents != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
            {item.participants || 1} {(item.participants || 1) > 1 ? 'jumpers' : 'jumper'}
          </Text>
          <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            {item.currency || '$'}{((item.priceCents || 0) / 100).toFixed(2)}
          </Text>
        </View>
      )}
    </SLCard>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6], paddingBottom: spacing[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Bookings
          </Text>
          <SLButton
            label="New Booking"
            onPress={() => router.push('/booking/new')}
            size="sm"
            iconLeft="plus"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing[6], paddingVertical: spacing[3], gap: spacing[2] }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: 9999,
              backgroundColor: filter === f.key ? colors.brand.primary : colors.gray[100],
            }}
          >
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: filter === f.key ? colors.text.inverse : colors.text.secondary,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Booking List */}
      {isLoading ? (
        <View>
          {[1, 2, 3].map((i) => <SLSkeletonRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={bookings || []}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={{ paddingHorizontal: spacing[6], paddingTop: spacing[2], paddingBottom: spacing[8] }}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          ListEmptyComponent={
            <SLEmptyState
              icon="calendar"
              title="No Bookings"
              description={filter === 'UPCOMING' ? 'Book your next jump to get started' : 'No past bookings found'}
              actionLabel="Book a Jump"
              onAction={() => router.push('/booking/new')}
            />
          }
        />
      )}
    </View>
  );
}
