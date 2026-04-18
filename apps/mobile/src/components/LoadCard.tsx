import React from 'react';
import { View, Text } from 'react-native';
import { SLCard, SLStatusBadge, SLProgressBar, SLIcon } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface Load {
  id: string;
  aircraftIdentifier: string;
  status: 'FILLING' | 'LOCKED' | 'BOARDING' | 'IN_FLIGHT' | 'COMPLETED';
  slotsAvailable: number;
  totalSlots: number;
  departureTime: string;
}

export default function LoadCard({ load, onPress }: { load: Load; onPress?: () => void }) {
  const departureDate = new Date(load.departureTime);
  const now = new Date();
  const minutesUntilDeparture = Math.floor(
    (departureDate.getTime() - now.getTime()) / 60000
  );

  const timeString =
    minutesUntilDeparture < 0
      ? 'Departed'
      : minutesUntilDeparture < 60
        ? `${minutesUntilDeparture}m`
        : `${Math.floor(minutesUntilDeparture / 60)}h`;

  const filledSlots = load.totalSlots - load.slotsAvailable;
  const fillProgress = load.totalSlots > 0 ? filledSlots / load.totalSlots : 0;

  const timeColor =
    load.status === 'BOARDING'
      ? colors.brand.danger
      : load.status === 'LOCKED'
        ? colors.brand.warning
        : colors.brand.primary;

  return (
    <SLCard padding="md" shadow="sm" onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[0.5] }}>
            AIRCRAFT
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
            <SLIcon name="plane" size="sm" color={colors.text.secondary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {load.aircraftIdentifier}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: spacing[1.5] }}>
          <SLStatusBadge status={load.status} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <SLIcon name="clock" size="xs" color={timeColor} />
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: timeColor }}>
              {timeString}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <View>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[0.5] }}>
            DEPARTURE
          </Text>
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
            {departureDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[0.5] }}>
            SLOTS
          </Text>
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            {load.slotsAvailable === 0 ? 'Full' : `${filledSlots} / ${load.totalSlots}`}
          </Text>
        </View>
      </View>

      {load.slotsAvailable > 0 && (
        <SLProgressBar
          progress={fillProgress}
          color={fillProgress > 0.85 ? colors.brand.warning : colors.brand.primary}
          height={4}
        />
      )}
    </SLCard>
  );
}
