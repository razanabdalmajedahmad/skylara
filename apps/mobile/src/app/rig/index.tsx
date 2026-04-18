import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export interface Rig {
  id: string;
  nickname: string;
  containerMake: string;
  containerModel: string;
  mainCanopy: string;
  reserveCanopy: string;
  aadType: string | null;
  maintenanceStatus: 'OK' | 'DUE_SOON' | 'DUE_NOW' | 'OVERDUE' | 'GROUNDED';
  jumpsSinceLastService: number;
  nextServiceDueDate: string | null;
}

type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  OK: { variant: 'success', label: 'OK' },
  DUE_SOON: { variant: 'warning', label: 'Due Soon' },
  DUE_NOW: { variant: 'warning', label: 'Due Now' },
  OVERDUE: { variant: 'error', label: 'Overdue' },
  GROUNDED: { variant: 'error', label: 'Grounded' },
};

function useRigs() {
  return useQuery({
    queryKey: ['rigs'],
    queryFn: async () => {
      const response = await api.get('/rigs');
      const raw = (response.data ?? []) as any[];
      return raw.map((r: any) => ({
        id: String(r.id),
        nickname: r.rigName || '',
        containerMake: r.container?.manufacturer || '',
        containerModel: r.container?.model || '',
        mainCanopy: r.mainCanopy
          ? `${r.mainCanopy.manufacturer || ''} ${r.mainCanopy.model || ''}`.trim()
          : 'Unknown',
        reserveCanopy: r.reserve
          ? `${r.reserve.manufacturer || ''} ${r.reserve.model || ''}`.trim()
          : 'Unknown',
        aadType: r.aad
          ? `${r.aad.manufacturer || ''} ${r.aad.model || ''}`.trim()
          : null,
        maintenanceStatus: r.maintenanceStatus || 'OK',
        jumpsSinceLastService: r.mainCanopy?.jumpsSinceInspection ?? r.totalJumps ?? 0,
        nextServiceDueDate: r.reserve?.repackDueDate || r.aad?.nextServiceDueDate || null,
      })) as Rig[];
    },
    staleTime: 60000,
  });
}

export default function RigListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data: rigs, isLoading, error, refetch } = useRigs();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>My Rigs</Text>
        </View>
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeleton width="100%" height={100} />
          <SLSkeleton width="100%" height={100} />
          <SLSkeleton width="100%" height={100} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>My Rigs</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>Gear and maintenance status</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Failed to Load Rigs" description="There was a problem loading your gear." actionLabel="Try Again" onAction={() => refetch()} />
        </View>
      ) : !rigs || rigs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="shield" title="No Rigs Found" description="Add your gear to track maintenance and jump counts." />
        </View>
      ) : (
        <FlatList
          data={rigs}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[4] }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = STATUS_BADGE[item.maintenanceStatus] || STATUS_BADGE.OK;
            return (
              <Pressable onPress={() => router.push(`/rig/${item.id}`)}>
                <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[3] } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <View style={{ flex: 1, marginRight: spacing[3] }}>
                      <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary, fontSize: typography.fontSize.base }}>{item.nickname || item.containerModel}</Text>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>{item.containerMake} {item.containerModel}</Text>
                    </View>
                    <SLBadge label={status.label} variant={status.variant} />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: spacing[2] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="wind" size="xs" color={colors.text.tertiary} />
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Main: {item.mainCanopy}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="shield" size="xs" color={colors.text.tertiary} />
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Reserve: {item.reserveCanopy}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Jumps since service: {item.jumpsSinceLastService}</Text>
                    {item.nextServiceDueDate && (
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Due: {new Date(item.nextServiceDueDate).toLocaleDateString()}</Text>
                    )}
                  </View>
                </SLCard>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
