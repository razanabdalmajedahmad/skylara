import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadDetail } from '@/hooks/useLoadDetail';
import { useDropzoneStore } from '@/stores/dropzone';
import { useAuthStore } from '@/stores/auth';
import { useRealtimeLoad } from '@/hooks/useRealtimeLoad';
import { api } from '@/lib/api';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { SLCard, SLIcon, SLBadge, SLButton, SLAvatar, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

interface Slot {
  id: string;
  userId: number;
  userName: string;
  slotType: string;
  jumpType: string;
  position?: string;
  isCheckedIn?: boolean;
  licenseLevel?: string;
  groupAssignment?: string;
  weight?: number;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'FILLING': return 'info';
    case 'BOARDING': return 'success';
    case 'LOCKED': return 'warning';
    case 'IN_FLIGHT': return 'danger';
    case 'COMPLETED': return 'neutral';
    default: return 'neutral';
  }
}

function getLicenseVariant(level?: string): 'success' | 'info' | 'neutral' {
  switch (level?.toUpperCase()) {
    case 'AFF': return 'success';
    case 'TANDEM': return 'info';
    default: return 'neutral';
  }
}

export default function LoadDetailScreen() {
  const { loadId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: loadDetail, isLoading } = useLoadDetail(loadId as string);

  useRealtimeLoad(loadId ? Number(loadId) : undefined);

  useEffect(() => {
    const channel = loadId ? `load:${loadId}` : null;
    if (channel) {
      subscribeToChannel(channel);
    }
    return () => {
      if (channel && typeof unsubscribeFromChannel === 'function') {
        unsubscribeFromChannel(channel);
      }
    };
  }, [loadId]);

  const userSlot = useMemo(() => {
    if (!loadDetail?.slots || !user) return null;
    return loadDetail.slots.find((slot: Slot) => slot.userId === user.id);
  }, [loadDetail?.slots, user]);

  const handleJoinLoad = async () => {
    if (!dzId || !loadId) return;
    try {
      await api.post(`/loads/${loadId}/slots`, {
        userId: String(user?.id),
        slotType: 'FUN',
        jumpType: 'FUN_JUMP',
        weight: user?.profile?.weight || 180,
      });
      queryClient.invalidateQueries({ queryKey: ['load', dzId, loadId] });
    } catch {
      Alert.alert('Error', 'Failed to join load. Please try again.');
    }
  };

  const handleRemoveFromLoad = async () => {
    if (!dzId || !loadId || !userSlot) return;
    Alert.alert('Leave Load', 'Remove yourself from this load?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/loads/${loadId}/slots/${userSlot.id}`);
            queryClient.invalidateQueries({ queryKey: ['load', dzId, loadId] });
          } catch {
            Alert.alert('Error', 'Failed to remove from load');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
        <View style={{ padding: spacing[6], gap: spacing[4] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      </View>
    );
  }

  if (!loadDetail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        <SLEmptyState
          icon="plane"
          title="Load Not Found"
          description="This load could not be loaded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const departureDate = new Date(loadDetail.departureTime);
  const slotsUsed = loadDetail.totalSlots - loadDetail.slotsAvailable;

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
          <SLBadge label={loadDetail.status} variant={getStatusVariant(loadDetail.status)} />
        </View>

        <Text
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.inverse,
            marginBottom: spacing[1],
          }}
        >
          {loadDetail.aircraftIdentifier}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[3] }}>
          <View>
            <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.6)' }}>
              DEPARTURE
            </Text>
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>
              {departureDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.6)' }}>
              SLOTS
            </Text>
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>
              {slotsUsed}/{loadDetail.totalSlots}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Load Info */}
        <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
          <Text
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.tertiary,
              marginBottom: spacing[3],
              letterSpacing: 1,
            }}
          >
            LOAD INFO
          </Text>

          <View style={{ gap: spacing[3] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Status</Text>
              <SLBadge label={loadDetail.status} variant={getStatusVariant(loadDetail.status)} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Slots Available</Text>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: loadDetail.slotsAvailable > 0 ? colors.brand.success : colors.brand.danger }}>
                {loadDetail.slotsAvailable}
              </Text>
            </View>
            {loadDetail.loadMaster && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Load Master</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <SLAvatar
                      firstName={loadDetail.loadMaster.firstName}
                      lastName={loadDetail.loadMaster.lastName}
                      size="xs"
                    />
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {loadDetail.loadMaster.firstName} {loadDetail.loadMaster.lastName}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </SLCard>

        {/* Jumpers */}
        <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.tertiary,
                letterSpacing: 1,
              }}
            >
              JUMPERS ON THIS LOAD
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {loadDetail.slots?.length || 0} total
            </Text>
          </View>

          {loadDetail.slots && loadDetail.slots.length > 0 ? (
            loadDetail.slots.map((slot, idx) => {
              const isUserSlot = slot.userId === user?.id;
              const nameParts = slot.userName.split(' ');
              return (
                <View
                  key={slot.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing[3],
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                    backgroundColor: isUserSlot ? colors.sky[50] : 'transparent',
                    marginHorizontal: -spacing[4],
                    paddingHorizontal: spacing[4],
                    borderRadius: isUserSlot ? 8 : 0,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                    <SLAvatar
                      firstName={nameParts[0]}
                      lastName={nameParts[1]}
                      size="sm"
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: isUserSlot ? typography.fontWeight.bold : typography.fontWeight.semibold,
                          color: isUserSlot ? colors.brand.primary : colors.text.primary,
                        }}
                      >
                        {slot.userName} {isUserSlot ? '(You)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
                        {slot.licenseLevel && (
                          <SLBadge label={slot.licenseLevel} variant={getLicenseVariant(slot.licenseLevel)} />
                        )}
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                          {slot.jumpType}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {slot.isCheckedIn && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="check-circle" size="sm" color={colors.brand.success} />
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={{ paddingVertical: spacing[4], alignItems: 'center' }}>
              <Text style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                No jumpers yet
              </Text>
            </View>
          )}
        </SLCard>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          paddingBottom: insets.bottom + spacing[4],
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {!userSlot && loadDetail.slotsAvailable > 0 ? (
          <SLButton
            label="Join This Load"
            onPress={handleJoinLoad}
            size="lg"
            fullWidth
            iconRight="arrow-right"
          />
        ) : userSlot ? (
          <SLButton
            label="Leave Load"
            onPress={handleRemoveFromLoad}
            variant="danger"
            size="lg"
            fullWidth
            iconLeft="x"
          />
        ) : (
          <SLButton
            label="Load Full"
            onPress={() => {}}
            variant="ghost"
            size="lg"
            fullWidth
            disabled
          />
        )}
      </View>
    </View>
  );
}
