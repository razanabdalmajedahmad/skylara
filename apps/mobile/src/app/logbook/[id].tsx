import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLogbookEntry, useDeleteLogbookEntry } from '@/hooks/useLogbook';
import { SLIcon, SLButton, SLCard, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const JUMP_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  FREEFLY: { bg: '#F3E8FF', text: '#7C3AED' },
  BELLY: { bg: '#DBEAFE', text: '#2563EB' },
  ANGLE: { bg: '#FFEDD5', text: '#EA580C' },
  WINGSUIT: { bg: '#D1FAE5', text: '#059669' },
  TRACKING: { bg: '#CFFAFE', text: '#0891B2' },
  HOP_N_POP: { bg: '#FEF3C7', text: '#B45309' },
  CRW: { bg: '#FFE4E6', text: '#E11D48' },
  TANDEM: { bg: '#E0E7FF', text: '#4F46E5' },
  AFF: { bg: '#CCFBF1', text: '#0D9488' },
};

function formatJumpTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FREEFLY: 'Freefly', BELLY: 'Belly', ANGLE: 'Angle', WINGSUIT: 'Wingsuit',
    TRACKING: 'Tracking', HOP_N_POP: 'Hop & Pop', CRW: 'CRW', TANDEM: 'Tandem', AFF: 'AFF',
  };
  return labels[type] || type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatSignOffDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function JumpDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const entryId = id ? parseInt(id) : null;
  const { data: entry, isLoading } = useLogbookEntry(entryId || 0);
  const { mutate: deleteEntry } = useDeleteLogbookEntry();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
            </Pressable>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Jump Detail</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeleton width="100%" height={120} />
          <SLSkeleton width="100%" height={80} />
          <SLSkeleton width="100%" height={80} />
        </View>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
            </Pressable>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Jump Detail</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="book-open" title="Jump Not Found" description="This logbook entry could not be loaded." actionLabel="Go Back" onAction={() => router.back()} />
        </View>
      </View>
    );
  }

  const jt = entry.jumpType;
  const typeColors =
    (jt && JUMP_TYPE_COLORS[jt]) || { bg: colors.gray[100], text: colors.text.secondary };

  const handleEdit = () => {
    Alert.alert('Coming Soon', 'Jump editing will be available in a future update.');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Jump',
      `Are you sure you want to delete Jump #${entry.jumpNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (entry.id) {
              deleteEntry(entry.id, { onSuccess: () => router.back() });
            }
          },
        },
      ]
    );
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
            Jump Detail
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ backgroundColor: colors.background, paddingHorizontal: spacing[6], paddingVertical: spacing[6], borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
            <View>
              <Text style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Jump #{entry.jumpNumber}
              </Text>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[1] }}>
                {formatDate(entry.createdAt)}
              </Text>
            </View>
            <View style={{ backgroundColor: typeColors.bg, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 20 }}>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: typeColors.text }}>
                {formatJumpTypeLabel(entry.jumpType || 'UNKNOWN')}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <SLIcon name="map-pin" size="xs" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              {entry.dropzoneName || 'Unknown DZ'}
            </Text>
          </View>
        </View>

        <View style={{ padding: spacing[6], gap: spacing[4] }}>
          {/* Stats Grid */}
          <View>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
              JUMP STATS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
              {entry.altitude && <StatBox label="Altitude" value={`${entry.altitude.toLocaleString()} ft`} icon="arrow-up" />}
              {entry.freefallTime && <StatBox label="Freefall Time" value={`${entry.freefallTime}s`} icon="clock" />}
              {entry.deploymentAltitude && <StatBox label="Deployment Alt" value={`${entry.deploymentAltitude.toLocaleString()} ft`} icon="wind" />}
              {entry.canopySize && <StatBox label="Canopy Size" value={`${entry.canopySize} sq ft`} icon="target" />}
            </View>
          </View>

          {/* Disciplines */}
          {entry.disciplines && entry.disciplines.length > 0 && (
            <View>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                DISCIPLINES
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                {entry.disciplines.map((discipline: string) => (
                  <View key={discipline} style={{ backgroundColor: colors.sky[50], borderWidth: 1, borderColor: colors.sky[200], paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 20 }}>
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.sky[700] }}>
                      {discipline}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {entry.notes && (
            <View>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                NOTES
              </Text>
              <SLCard padding="lg">
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 }}>
                  {entry.notes}
                </Text>
              </SLCard>
            </View>
          )}

          {/* Load Info */}
          {(entry.load || entry.loadId) && (
            <View>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                LOAD INFORMATION
              </Text>
              <SLCard padding="lg">
                {entry.load?.id && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>Load ID</Text>
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      #{entry.load.id}
                    </Text>
                  </View>
                )}
                {entry.load?.aircraftIdentifier && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>Aircraft</Text>
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {entry.load.aircraftIdentifier}
                    </Text>
                  </View>
                )}
              </SLCard>
            </View>
          )}

          {/* Coach / Instructor Sign-offs */}
          {entry.coachSignOff && (
            <View>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                COACH SIGN-OFF
              </Text>
              <SLCard padding="lg">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <SLIcon name="check-circle" size="md" color={colors.brand.success} />
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    {entry.coachSignOff.coachName}
                  </Text>
                </View>
                {entry.coachSignOff.notes && (
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing[1] }}>
                    {entry.coachSignOff.notes}
                  </Text>
                )}
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                  {formatSignOffDate(entry.coachSignOff.signedAt)}
                </Text>
              </SLCard>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ gap: spacing[3], paddingBottom: spacing[8] }}>
            <SLButton label="Edit Jump" onPress={handleEdit} fullWidth iconLeft="edit" />
            <SLButton label="Delete Jump" onPress={handleDelete} variant="outline" fullWidth iconLeft="trash" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <SLCard padding="md" style={{ flex: 1, minWidth: '45%' } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
        <SLIcon name={icon} size="sm" color={colors.brand.primary} />
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.semibold }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        {value}
      </Text>
    </SLCard>
  );
}
