import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLCard, SLIcon, SLBadge, SLButton, SLAvatar, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useBookingDetail, useCancelBooking } from '@/hooks/useBookings';

const TYPE_LABELS: Record<string, string> = {
  TANDEM: 'Tandem Jump',
  AFF: 'AFF Training',
  FUN_JUMP: 'Fun Jump',
  COACH_JUMP: 'Coach Jump',
};

const TYPE_ICONS: Record<string, IconName> = {
  TANDEM: 'users',
  AFF: 'graduation-cap',
  FUN_JUMP: 'zap',
  COACH_JUMP: 'shield',
};

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'CONFIRMED': return 'success';
    case 'PENDING': return 'warning';
    case 'CHECKED_IN':
    case 'COMPLETED': return 'info';
    case 'CANCELLED': return 'danger';
    default: return 'neutral';
  }
}

function formatDateTime(dateStr: string, timeStr: string): string {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showQRModal, setShowQRModal] = useState(false);

  const bookingId = id ? parseInt(id) : undefined;
  const { data: booking, isLoading, error } = useBookingDetail(bookingId);
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: spacing[6], gap: spacing[4] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        <SLEmptyState
          icon="alert-triangle"
          title="Booking Not Found"
          description="Could not load this booking."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const typeLabel = TYPE_LABELS[booking.type] || booking.type;
  const typeIcon = TYPE_ICONS[booking.type] || 'plane';
  const isCheckInDay =
    booking.status === 'CONFIRMED' &&
    new Date(booking.scheduledDate).toDateString() === new Date().toDateString();
  const canCancel = booking.status === 'CONFIRMED' || booking.status === 'PENDING';

  const handleCancelBooking = () => {
    Alert.alert('Cancel Booking?', 'This action cannot be undone.', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: () => {
          if (bookingId) {
            cancelBooking(bookingId, {
              onSuccess: () => {
                Alert.alert('Cancelled', 'Your booking has been cancelled.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
              onError: (err) => {
                Alert.alert('Error', (err as any)?.message || 'Failed to cancel booking');
              },
            });
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my jump booking at SkyLara: ${typeLabel} on ${formatDateTime(booking.scheduledDate, booking.scheduledTime)}`,
        title: 'Share Booking',
      });
    } catch {
      // Share cancelled or failed
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Hero Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[6],
          backgroundColor: colors.sky[900],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.inverse} />
          </Pressable>
          <Pressable onPress={handleShare} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="share" size="md" color={colors.text.inverse} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <SLBadge label={booking.status} variant={getStatusVariant(booking.status)} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[1] }}>
          <SLIcon name={typeIcon} size="lg" color={colors.text.inverse} />
          <Text
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.inverse,
              flex: 1,
            }}
          >
            {typeLabel}
          </Text>
        </View>

        <Text
          style={{
            fontSize: typography.fontSize.base,
            color: 'rgba(255,255,255,0.85)',
            marginBottom: spacing[4],
          }}
        >
          {formatDateTime(booking.scheduledDate, booking.scheduledTime)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.6)' }}>
              Total Price
            </Text>
            <Text
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.inverse,
              }}
            >
              {booking.price.toFixed(2)} {booking.currency}
            </Text>
          </View>
          {isCheckInDay && (
            <SLButton
              label="Show QR"
              onPress={() => setShowQRModal(true)}
              variant="outline"
              iconLeft="qr-code"
              size="sm"
            />
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Details */}
        <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
          <Text
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.tertiary,
              marginBottom: spacing[4],
              letterSpacing: 1,
            }}
          >
            BOOKING DETAILS
          </Text>

          <DetailRow icon="calendar" label="Date & Time" value={formatDateTime(booking.scheduledDate, booking.scheduledTime)} />
          <DetailRow icon="ticket" label="Booking ID" value={`#${booking.id}`} isLast={!booking.packageName} />
          {booking.packageName && (
            <DetailRow icon="package" label="Package" value={booking.packageName} isLast />
          )}
        </SLCard>

        {/* Instructor */}
        {booking.instructorName && (
          <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.tertiary,
                marginBottom: spacing[4],
                letterSpacing: 1,
              }}
            >
              INSTRUCTOR
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <SLAvatar
                firstName={booking.instructorName.split(' ')[0]}
                lastName={booking.instructorName.split(' ')[1]}
                size="md"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {booking.instructorName}
                </Text>
                {booking.instructorRating && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2 }}>
                    <SLIcon name="star" size="xs" color={colors.accent.star} />
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                      {booking.instructorRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </SLCard>
        )}

        {/* Location */}
        {(booking.dzName || booking.location) && (
          <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.tertiary,
                marginBottom: spacing[4],
                letterSpacing: 1,
              }}
            >
              LOCATION
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
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
                <SLIcon name="map-pin" size="md" color={colors.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                {booking.dzName && (
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {booking.dzName}
                  </Text>
                )}
                {booking.location && (
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 }}>
                    {booking.location}
                  </Text>
                )}
              </View>
            </View>
          </SLCard>
        )}

        {/* Timeline */}
        {booking.timeline && booking.timeline.length > 0 && (
          <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.tertiary,
                marginBottom: spacing[4],
                letterSpacing: 1,
              }}
            >
              TIMELINE
            </Text>
            {booking.timeline.map((event, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: spacing[3], marginBottom: idx < booking.timeline!.length - 1 ? spacing[4] : 0 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.primary }} />
                  {idx < booking.timeline!.length - 1 && (
                    <View style={{ width: 2, flex: 1, backgroundColor: colors.gray[200], marginTop: spacing[1] }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing[2] }}>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {event.event}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </SLCard>
        )}

        {/* Notes */}
        {booking.notes && (
          <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4], backgroundColor: colors.sky[50] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <SLIcon name="info" size="sm" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
                Notes
              </Text>
            </View>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: typography.lineHeight.sm }}>
              {booking.notes}
            </Text>
          </SLCard>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          paddingBottom: insets.bottom + spacing[4],
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: spacing[3],
        }}
      >
        {booking.status === 'COMPLETED' && (
          <SLButton
            label="Rate Your Experience"
            onPress={() => Alert.alert('Coming Soon', 'Rating feature will be available soon.')}
            size="lg"
            fullWidth
            iconLeft="star"
          />
        )}

        {booking.status === 'CANCELLED' && (
          <SLButton
            label="Rebook"
            onPress={() => router.push('/booking/new')}
            size="lg"
            fullWidth
            iconRight="arrow-right"
          />
        )}

        {canCancel && (
          <SLButton
            label={isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            onPress={handleCancelBooking}
            variant="danger"
            size="lg"
            fullWidth
            loading={isCancelling}
          />
        )}
      </View>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[6],
          }}
        >
          <Pressable
            onPress={() => setShowQRModal(false)}
            style={{ position: 'absolute', top: insets.top + spacing[4], right: spacing[6] }}
          >
            <SLIcon name="x" size="xl" color={colors.text.inverse} />
          </Pressable>

          <SLCard padding="lg" shadow="lg" style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[1] }}>
              Check In
            </Text>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[6] }}>
              Show this code at the drop zone check-in counter
            </Text>

            <View
              style={{
                width: 200,
                height: 200,
                backgroundColor: colors.gray[100],
                borderRadius: radii.lg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing[6],
                borderWidth: 2,
                borderColor: colors.border,
              }}
            >
              <SLIcon name="qr-code" size="3xl" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[2] }}>
                {booking.qrCode || 'Generating...'}
              </Text>
            </View>

            <SLButton
              label="Close"
              onPress={() => setShowQRModal(false)}
              size="lg"
              fullWidth
            />
          </SLCard>
        </View>
      </Modal>
    </View>
  );
}

// ─── Detail Row Helper ──────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing[3],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <SLIcon name={icon} size="sm" color={colors.text.tertiary} />
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
        {value}
      </Text>
    </View>
  );
}
