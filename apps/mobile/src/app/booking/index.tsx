import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLCard, SLIcon, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useBookings, type Booking } from '@/hooks/useBookings';

const TYPE_ICONS: Record<string, IconName> = {
  TANDEM: 'users',
  AFF: 'graduation-cap',
  FUN_JUMP: 'zap',
  COACH_JUMP: 'shield',
};

const TYPE_LABELS: Record<string, string> = {
  TANDEM: 'Tandem',
  AFF: 'AFF Level 1',
  FUN_JUMP: 'Fun Jump',
  COACH_JUMP: 'Coach Jump',
};

type FilterStatus = 'UPCOMING' | 'PAST' | 'CANCELLED';

function formatDate(dateStr: string, timeStr: string): string {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterBookings(bookings: Booking[], filter: FilterStatus): Booking[] {
  const now = new Date();
  return bookings.filter((booking) => {
    const bookingDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
    switch (filter) {
      case 'UPCOMING':
        return bookingDate > now && booking.status !== 'CANCELLED';
      case 'PAST':
        return bookingDate <= now && booking.status !== 'CANCELLED';
      case 'CANCELLED':
        return booking.status === 'CANCELLED';
      default:
        return true;
    }
  });
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'CHECKED_IN':
    case 'COMPLETED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('UPCOMING');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, error, refetch } = useBookings();
  const filteredBookings = filterBookings(bookings || [], activeFilter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderBookingCard = ({ item: booking }: { item: Booking }) => {
    const icon = TYPE_ICONS[booking.type] || 'plane';
    const label = TYPE_LABELS[booking.type] || booking.type;

    return (
      <Pressable onPress={() => router.push(`/booking/${booking.id}`)}>
        <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.sky[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SLIcon name={icon} size="md" color={colors.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {label}
                </Text>
                {booking.packageName && (
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {booking.packageName}
                  </Text>
                )}
              </View>
            </View>
            <SLBadge label={booking.status} variant={getStatusVariant(booking.status)} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <SLIcon name="clock" size="xs" color={colors.text.tertiary} />
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {formatDate(booking.scheduledDate, booking.scheduledTime)}
                </Text>
              </View>
              {booking.instructorName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] }}>
                  <SLIcon name="user" size="xs" color={colors.text.tertiary} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    with {booking.instructorName}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {booking.price.toFixed(2)} {booking.currency}
            </Text>
          </View>
        </SLCard>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            My Bookings
          </Text>
          <Pressable onPress={() => router.push('/booking/new')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="plus" size="lg" color={colors.brand.primary} />
          </Pressable>
        </View>

        {/* Filter Pills */}
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {(['UPCOMING', 'PAST', 'CANCELLED'] as const).map((filter) => {
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
                  {filter === 'UPCOMING' ? 'Upcoming' : filter === 'PAST' ? 'Past' : 'Cancelled'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="alert-triangle"
            title="Error Loading Bookings"
            description="Could not load your bookings. Please try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon={activeFilter === 'UPCOMING' ? 'calendar' : activeFilter === 'PAST' ? 'check' : 'x'}
            title={
              activeFilter === 'UPCOMING'
                ? 'No Upcoming Jumps'
                : activeFilter === 'PAST'
                ? 'No Past Jumps'
                : 'No Cancelled Jumps'
            }
            description={
              activeFilter === 'UPCOMING'
                ? 'Book your next adventure to get started'
                : 'Your jump history will appear here'
            }
            actionLabel={activeFilter === 'UPCOMING' ? 'Book a Jump' : undefined}
            onAction={activeFilter === 'UPCOMING' ? () => router.push('/booking/new') : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/booking/new')}
        style={{
          position: 'absolute',
          bottom: insets.bottom + spacing[6],
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
