import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoads } from '@/hooks/useLoads';
import { useDropzoneStore } from '@/stores/dropzone';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { SLCard, SLIcon, SLBadge, SLButton, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

interface MyLoad {
  id: string;
  aircraftIdentifier: string;
  status: 'FILLING' | 'BOARDING' | 'LOCKED' | 'IN_FLIGHT' | 'COMPLETED';
  departureTime: string;
  slots: {
    id: string;
    userId: number;
    userName: string;
    isCheckedIn?: boolean;
  }[];
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'FILLING': return 'info';
    case 'BOARDING': return 'success';
    case 'LOCKED': return 'warning';
    case 'IN_FLIGHT': return 'danger';
    default: return 'neutral';
  }
}

export default function MyLoadsScreen() {
  const insets = useSafeAreaInsets();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: loads = [], isLoading, refetch } = useLoads();

  const myLoads = useMemo(() => {
    if (!user) return [];
    return loads.filter((load: any) =>
      load.slots?.some((slot: any) => slot.userId === user.id)
    ) as unknown as MyLoad[];
  }, [loads, user]);

  const handleRemoveFromLoad = async (loadId: string) => {
    Alert.alert('Remove from load', 'Remove yourself from this load?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!dzId || !user) return;
          try {
            const load = myLoads.find((l) => l.id === loadId);
            const slot = load?.slots.find((s) => s.userId === user.id);
            if (slot) {
              await api.delete(`/loads/${loadId}/slots/${slot.id}`);
              queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
              refetch();
            }
          } catch {
            Alert.alert('Error', 'Failed to remove from load');
          }
        },
      },
    ]);
  };

  const handleMoveToLoad = (loadId: string) => {
    Alert.alert('Move to different load', 'Are you sure you want to leave this load and select a new one?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move',
        onPress: () => {
          handleRemoveFromLoad(loadId);
          setTimeout(() => {
            router.push('/manifest/select-load');
          }, 500);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            My Loads
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : myLoads.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="plane"
            title="You're not on any loads"
            description="Check the Load Board to find and join a load"
            actionLabel="Open Load Board"
            onAction={() => router.push('/manifest/load-board')}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[20] }}
          showsVerticalScrollIndicator={false}
        >
          {myLoads.map((item) => {
            const checkedInCount = item.slots?.filter((s) => s.isCheckedIn).length || 0;
            const totalCount = item.slots?.length || 0;

            return (
              <SLCard key={item.id} padding="lg" shadow="sm" style={{ marginBottom: spacing[3] }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                      AIRCRAFT
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                      {item.aircraftIdentifier}
                    </Text>
                  </View>
                  <SLBadge label={item.status} variant={getStatusVariant(item.status)} />
                </View>

                {/* Jumpers in Group */}
                <View style={{ marginBottom: spacing[3], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[2] }}>
                    JUMPERS IN GROUP
                  </Text>
                  {item.slots?.map((slot) => (
                    <View key={slot.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: slot.isCheckedIn ? colors.brand.success : colors.gray[300],
                        }}
                      />
                      <Text style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {slot.userName}
                      </Text>
                      {slot.isCheckedIn && (
                        <SLIcon name="check" size="xs" color={colors.brand.success} />
                      )}
                    </View>
                  ))}
                </View>

                {/* Departure & Check-in */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
                  <View>
                    <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                      DEPARTURE
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="clock" size="xs" color={colors.text.tertiary} />
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        {new Date(item.departureTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                      CHECK-IN
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: checkedInCount === totalCount ? colors.brand.success : colors.text.primary }}>
                      {checkedInCount}/{totalCount}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <SLButton
                      label="Move"
                      onPress={() => handleMoveToLoad(item.id)}
                      variant="outline"
                      fullWidth
                      iconLeft="arrow-right"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SLButton
                      label="Remove"
                      onPress={() => handleRemoveFromLoad(item.id)}
                      variant="danger"
                      fullWidth
                      iconLeft="x"
                    />
                  </View>
                </View>
              </SLCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
