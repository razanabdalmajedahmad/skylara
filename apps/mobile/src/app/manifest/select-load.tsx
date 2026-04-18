import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoads } from '@/hooks/useLoads';
import { useDropzoneStore } from '@/stores/dropzone';
import { useAuthStore } from '@/stores/auth';
import { useManifestStore } from '@/stores/manifest';
import { useRealtimeLoads } from '@/hooks/useRealtimeLoads';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { SLIcon, SLButton, SLCard, SLBadge, SLEmptyState, SLProgressBar } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function SelectLoadScreen() {
  const insets = useSafeAreaInsets();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  const user = useAuthStore((s) => s.user);
  const { selfManifest, activeTeam, submitToLoad: _submitToLoad, clearSelfManifest } = useManifestStore();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [uncheckedMembers, setUncheckedMembers] = useState<string[]>([]);
  const [selectedLoadForSubmit, setSelectedLoadForSubmit] = useState<string | null>(null);

  const { data: loads = [], isLoading } = useLoads({ status: undefined });
  useRealtimeLoads();

  const availableLoads = useMemo(
    () => loads.filter((load: any) => load.status === 'FILLING' || load.status === 'BOARDING'),
    [loads]
  );

  const getTimeBadge = (departureTime: string): { label: string; variant: 'danger' | 'warning' | 'info' } => {
    const now = new Date();
    const departure = new Date(departureTime);
    const mins = Math.floor((departure.getTime() - now.getTime()) / 60000);

    if (mins < 0) return { label: 'Departed', variant: 'danger' };
    if (mins < 15) return { label: `${mins}m`, variant: 'danger' };
    if (mins < 30) return { label: `${mins}m`, variant: 'warning' };
    if (mins < 60) return { label: `${mins}m`, variant: 'info' };
    return { label: `${Math.floor(mins / 60)}h`, variant: 'info' };
  };

  const handleLoadSelect = async (loadId: string) => {
    if (!dzId || !user) return;

    const membersToManifest = activeTeam?.members || (selfManifest ? [selfManifest] : []);
    const unchecked = membersToManifest.filter((m) => !m.isCheckedIn).map((m) => m.name);

    if (unchecked.length > 0) {
      setUncheckedMembers(unchecked);
      setSelectedLoadForSubmit(loadId);
      setShowWarning(true);
    } else {
      await submitLoadManifest(loadId);
    }
  };

  const submitLoadManifest = async (loadId: string) => {
    if (!dzId || !user) return;

    setSubmitting(true);
    try {
      const membersToManifest = activeTeam?.members || (selfManifest ? [selfManifest] : []);

      for (const member of membersToManifest) {
        const jumpTypeObj: Record<string, string> = {
          'Full Altitude 150 (pack)': 'FT150_PACK',
          'Full Altitude 150': 'FT150',
          'Full Altitude 260 (pack)': 'FT260_PACK',
          'Full Altitude 260': 'FT260',
        };

        await api.post(`/loads/${loadId}/slots`, {
          userId: String(member.userId),
          slotType: 'FUN',
          jumpType: jumpTypeObj[member.jumpType] || 'FUN_JUMP',
          formation: member.formation,
          weight: member.weight || user.profile?.weight || 180,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['loads', dzId] });
      clearSelfManifest();
      Alert.alert('Success', 'Successfully manifested on load!');
      router.push(`/manifest/load-detail?loadId=${loadId}`);
    } catch {
      Alert.alert('Error', 'Failed to manifest on load. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
            Select Load
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeleton width="100%" height={140} />
          <SLSkeleton width="100%" height={140} />
          <SLSkeleton width="100%" height={140} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[12] }}>
          {availableLoads.length === 0 ? (
            <SLEmptyState
              icon="plane"
              title="No Available Loads"
              description="No loads are currently available for manifesting"
            />
          ) : (
            <View style={{ gap: spacing[3] }}>
              {availableLoads.map((item: any) => {
                const timeBadge = getTimeBadge(item.departureTime);
                const fillPercentage = Math.round(((item.totalSlots - item.slotsAvailable) / item.totalSlots) * 100);

                return (
                  <Pressable key={item.id} onPress={() => handleLoadSelect(item.id)} disabled={submitting}>
                    <SLCard padding="lg" shadow="sm">
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                            AIRCRAFT
                          </Text>
                          <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                            {item.aircraftIdentifier}
                          </Text>
                        </View>
                        <SLBadge label={timeBadge.label} variant={timeBadge.variant} />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                        <View>
                          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                            AVAILABLE SLOTS
                          </Text>
                          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                            {item.slotsAvailable} / {item.totalSlots}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[1] }}>
                            DEPARTURE
                          </Text>
                          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                            {new Date(item.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      {item.slotsAvailable > 0 && (
                        <SLProgressBar value={fillPercentage} />
                      )}

                      {submitting && selectedLoadForSubmit === item.id && (
                        <View style={{ marginTop: spacing[3], alignItems: 'center' }}>
                          <Text style={{ fontSize: typography.fontSize.xs, color: colors.brand.primary, fontWeight: typography.fontWeight.semibold }}>
                            Manifesting...
                          </Text>
                        </View>
                      )}
                    </SLCard>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Warning Modal */}
      <Modal visible={showWarning} transparent animationType="fade" onRequestClose={() => setShowWarning(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[4] }}
          onPress={() => setShowWarning(false)}
        >
          <Pressable
            style={{ backgroundColor: colors.surface, borderRadius: 16, padding: spacing[6], width: '100%', maxWidth: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
              <SLIcon name="alert-triangle" size="lg" color={colors.accent.orange} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Unchecked Jumpers
              </Text>
            </View>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing[4] }}>
              The following jumpers are not checked in:
            </Text>
            <View style={{ marginBottom: spacing[4], gap: spacing[2] }}>
              {uncheckedMembers.map((name) => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <SLIcon name="alert-circle" size="xs" color={colors.accent.orange} />
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <SLButton
                  label="Keep All"
                  onPress={() => { setShowWarning(false); selectedLoadForSubmit && submitLoadManifest(selectedLoadForSubmit); }}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <SLButton
                  label="Checked Only"
                  onPress={() => { setShowWarning(false); selectedLoadForSubmit && submitLoadManifest(selectedLoadForSubmit); }}
                  variant="outline"
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
