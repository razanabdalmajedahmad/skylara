import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useCheckinValidation } from '@/hooks/useCheckinValidation';
import { SLButton, SLIcon } from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';

export default function CheckInToggle() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(user?.checkedIn || false);
  const { data: validation, isLoading: validationLoading } = useCheckinValidation();

  const triggerHaptic = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(
        isCheckedIn
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    } catch {
      // Haptics unavailable
    }
  }, [isCheckedIn]);

  const handleToggle = async () => {
    if (!user?.id) return;

    // Check for blockers before allowing check-in
    if (!isCheckedIn && validation?.blockers && validation.blockers.length > 0) {
      const blockerList = validation.blockers.map((b: any) => `\u2022 ${b.message}`).join('\n');
      Alert.alert(
        'Cannot Check In',
        `You have the following issues that prevent check-in:\n\n${blockerList}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/jumpers/${user.id}/checkin`);
      setIsCheckedIn(response.data.checkedIn);
      await triggerHaptic();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle check-in status');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !isCheckedIn && (!validation?.canCheckin || validationLoading);

  return (
    <View>
      {/* Warnings banner */}
      {!isCheckedIn && validation?.warnings && validation.warnings.length > 0 && (
        <View
          style={{
            backgroundColor: '#FEF3C7',
            borderLeftWidth: 4,
            borderLeftColor: colors.brand.warning,
            padding: spacing[3],
            marginBottom: spacing[3],
            borderRadius: radii.md,
          }}
        >
          {validation.warnings.map((warning: any, index: number) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginBottom: index < validation.warnings.length - 1 ? spacing[1] : 0 }}>
              <SLIcon name="alert-triangle" size="xs" color={colors.brand.warning} />
              <Text style={{ fontSize: typography.fontSize.xs, color: '#92400E', flex: 1 }}>
                {warning.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      <SLButton
        label={isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
        onPress={handleToggle}
        variant={isCheckedIn ? 'danger' : 'primary'}
        size="sm"
        loading={loading || validationLoading}
        disabled={isDisabled}
        iconLeft={isCheckedIn ? 'log-out' : 'check'}
      />
    </View>
  );
}
