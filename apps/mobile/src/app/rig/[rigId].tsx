import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface MaintenanceEvent {
  id: string;
  type: string;
  description: string;
  performedBy: string;
  performedAt: string;
}

interface RigDetail {
  id: string;
  nickname: string;
  containerMake: string;
  containerModel: string;
  containerSerial: string;
  mainCanopy: string;
  mainSize: number;
  reserveCanopy: string;
  reserveSize: number;
  aadType: string | null;
  aadSerial: string | null;
  aadExpiryDate: string | null;
  maintenanceStatus: 'OK' | 'DUE_SOON' | 'DUE_NOW' | 'OVERDUE' | 'GROUNDED';
  groundedReason: string | null;
  jumpsSinceLastService: number;
  totalJumps: number;
  nextServiceDueDate: string | null;
  lastServiceDate: string | null;
  recentMaintenanceEvents: MaintenanceEvent[];
}

type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; variant: BadgeVariant }> = {
  OK: { bg: colors.tint.success.bg, text: colors.tint.success.text, border: colors.tint.success.border, label: 'OK', variant: 'success' },
  DUE_SOON: { bg: colors.tint.warning.bg, text: colors.tint.warning.text, border: colors.tint.warning.border, label: 'Due Soon', variant: 'warning' },
  DUE_NOW: { bg: colors.tint.orange.bg, text: colors.tint.orange.text, border: colors.tint.orange.border, label: 'Service Due Now', variant: 'warning' },
  OVERDUE: { bg: colors.tint.danger.bg, text: colors.tint.danger.text, border: colors.tint.danger.border, label: 'Overdue', variant: 'error' },
  GROUNDED: { bg: colors.tint.danger.bg, text: colors.accent.deepRed, border: colors.tint.danger.border, label: 'Grounded', variant: 'error' },
};

export default function RigDetailScreen() {
  const { rigId } = useLocalSearchParams<{ rigId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: rig, isLoading, error, refetch } = useQuery({
    queryKey: ['rig', rigId],
    queryFn: async () => {
      const response = await api.get(`/rigs/${rigId}`);
      const r = response.data as any;
      return {
        id: String(r.id),
        nickname: r.rigName || '',
        containerMake: r.container?.manufacturer || '',
        containerModel: r.container?.model || '',
        containerSerial: r.container?.serialNumber || r.serialNumber || '',
        mainCanopy: r.mainCanopy
          ? `${r.mainCanopy.manufacturer || ''} ${r.mainCanopy.model || ''}`.trim()
          : 'Unknown',
        mainSize: parseInt(r.mainCanopy?.size) || 0,
        reserveCanopy: r.reserve
          ? `${r.reserve.manufacturer || ''} ${r.reserve.model || ''}`.trim()
          : 'Unknown',
        reserveSize: parseInt(r.reserve?.size) || 0,
        aadType: r.aad ? `${r.aad.manufacturer || ''} ${r.aad.model || ''}`.trim() : null,
        aadSerial: r.aad?.serialNumber || null,
        aadExpiryDate: r.aad?.endOfLifeDate || null,
        maintenanceStatus: r.maintenanceStatus || 'OK',
        groundedReason: r.notes || null,
        jumpsSinceLastService: r.mainCanopy?.jumpsSinceInspection ?? 0,
        totalJumps: r.totalJumps ?? 0,
        nextServiceDueDate: r.reserve?.repackDueDate || r.aad?.nextServiceDueDate || null,
        lastServiceDate: r.mainCanopy?.lastInspectionDate || r.reserve?.repackDate || null,
        recentMaintenanceEvents: (r.maintenanceEvents || []).map((e: any) => ({
          id: String(e.id),
          type: e.eventType || e.type || '',
          description: e.description || e.notes || '',
          performedBy: e.performedByName || 'Unknown',
          performedAt: e.eventDate || e.createdAt || '',
        })),
      } as RigDetail;
    },
    enabled: !!rigId,
    staleTime: 60000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: spacing[3] }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
            </Pressable>
            <SLSkeleton width={160} height={24} />
          </View>
        </View>
        <View style={{ padding: spacing[6], gap: spacing[4] }}>
          <SLSkeleton width="100%" height={80} />
          <SLSkeleton width="100%" height={200} />
          <SLSkeleton width="100%" height={150} />
        </View>
      </View>
    );
  }

  if (error || !rig) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Failed to Load Rig" description="There was a problem loading rig details." actionLabel="Try Again" onAction={() => refetch()} />
        </View>
      </View>
    );
  }

  const status = STATUS_CONFIG[rig.maintenanceStatus] || STATUS_CONFIG.OK;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: spacing[2] }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{rig.nickname || rig.containerModel}</Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>{rig.containerMake} {rig.containerModel} - SN: {rig.containerSerial}</Text>
            </View>
            <SLBadge label={status.label} variant={status.variant} />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4] }}>
          {/* Maintenance Status Banner */}
          <View style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border, borderRadius: 12, padding: spacing[4], marginBottom: spacing[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <SLIcon name={rig.maintenanceStatus === 'OK' ? 'check-circle' : 'alert-triangle'} size="md" color={status.text} />
              <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, color: status.text }}>{status.label}</Text>
            </View>
            {rig.groundedReason && (
              <Text style={{ fontSize: typography.fontSize.sm, color: status.text, marginTop: spacing[1] }}>Reason: {rig.groundedReason}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6], marginTop: spacing[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <SLIcon name="hash" size="xs" color={colors.text.secondary} />
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Jumps since service: {rig.jumpsSinceLastService}</Text>
              </View>
              {rig.nextServiceDueDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                  <SLIcon name="calendar" size="xs" color={colors.text.secondary} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Due: {new Date(rig.nextServiceDueDate).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Gear Details */}
          <SLCard padding="lg" style={{ marginBottom: spacing[4] } as any}>
            <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>Gear Details</Text>
            <InfoRow icon="wind" label="Main Canopy" value={`${rig.mainCanopy} (${rig.mainSize} sqft)`} />
            <InfoRow icon="shield" label="Reserve Canopy" value={`${rig.reserveCanopy} (${rig.reserveSize} sqft)`} />
            <InfoRow icon="cpu" label="AAD" value={rig.aadType || 'None'} />
            {rig.aadSerial && <InfoRow icon="hash" label="AAD Serial" value={rig.aadSerial} />}
            {rig.aadExpiryDate && <InfoRow icon="calendar" label="AAD Expiry" value={new Date(rig.aadExpiryDate).toLocaleDateString()} />}
            <InfoRow icon="activity" label="Total Jumps" value={String(rig.totalJumps)} />
            {rig.lastServiceDate && <InfoRow icon="tool" label="Last Service" value={new Date(rig.lastServiceDate).toLocaleDateString()} />}
          </SLCard>

          {/* Maintenance History */}
          <SLCard padding="lg">
            <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>Recent Maintenance</Text>
            {rig.recentMaintenanceEvents.length === 0 ? (
              <View style={{ paddingVertical: spacing[4], alignItems: 'center' }}>
                <SLIcon name="clipboard" size="md" color={colors.text.tertiary} />
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[2], textAlign: 'center' }}>No maintenance events recorded</Text>
              </View>
            ) : (
              rig.recentMaintenanceEvents.map((event, index) => (
                <View key={event.id} style={{ paddingVertical: spacing[3], borderBottomWidth: index < rig.recentMaintenanceEvents.length - 1 ? 1 : 0, borderBottomColor: colors.gray[50] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <SLIcon name="tool" size="xs" color={colors.brand.primary} />
                      <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>{event.type}</Text>
                    </View>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{new Date(event.performedAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing[1], marginLeft: spacing[5] }}>{event.description}</Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2, marginLeft: spacing[5] }}>By: {event.performedBy}</Text>
                </View>
              ))
            )}
          </SLCard>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.gray[50] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <SLIcon name={icon} size="xs" color={colors.text.tertiary} />
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{value}</Text>
    </View>
  );
}
