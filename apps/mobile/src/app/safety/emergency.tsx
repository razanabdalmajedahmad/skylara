import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { useAuthStore } from '@/stores/auth';
import { SLCard, SLIcon, SLButton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

export default function EmergencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const { user } = useAuthStore();
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const emergencyMutation = useMutation({
    mutationFn: async () => {
      if (!activeDz?.id) throw new Error('No active dropzone');
      await api.post('/emergency/activate', {});
    },
    onSuccess: () => {
      Alert.alert(
        'Emergency Activated',
        'All staff have been notified. All loads are grounded.'
      );
      setShowConfirmation(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to activate emergency');
    },
  });

  const startLongPress = () => {
    setPressStartTime(Date.now());
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    if (pressStartTime) {
      const elapsed = Date.now() - pressStartTime;
      if (elapsed >= 3000) {
        setShowConfirmation(true);
      } else {
        progressAnim.setValue(0);
      }
    }
    setPressStartTime(null);
  };

  const handleConfirmEmergency = async () => {
    await emergencyMutation.mutateAsync();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const emergencyProfile = {
    bloodType: user?.emergencyProfile?.bloodType ?? user?.profile?.bloodType ?? 'Not set',
    allergies: user?.emergencyProfile?.allergies ?? user?.profile?.allergies ?? 'Not set',
    medications: user?.emergencyProfile?.medications ?? user?.profile?.medications ?? 'Not set',
  };

  const emergencyContacts = [
    { name: user?.emergencyContactName || 'Not set', phone: user?.emergencyContactPhone || 'Not set' },
  ].filter(c => c.name !== 'Not set');

  const profileItems: { icon: IconName; label: string; value: string }[] = [
    { icon: 'heart', label: 'BLOOD TYPE', value: emergencyProfile.bloodType },
    { icon: 'alert-triangle', label: 'ALLERGIES', value: emergencyProfile.allergies },
    { icon: 'pill', label: 'MEDICATIONS', value: emergencyProfile.medications },
  ];

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
            DZ Emergency
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <View
          style={{
            backgroundColor: colors.tint.danger.bg,
            borderWidth: 2,
            borderColor: colors.tint.danger.border,
            borderRadius: 12,
            padding: spacing[4],
            marginBottom: spacing[8],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <SLIcon name="alert-triangle" size="lg" color={colors.brand.danger} />
          <Text style={{ flex: 1, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.tint.danger.text, lineHeight: 20 }}>
            This action will alert ALL DZ staff and ground ALL loads immediately.
          </Text>
        </View>

        {/* SOS Button */}
        <View style={{ alignItems: 'center', marginBottom: spacing[8] }}>
          <Pressable
            onPressIn={startLongPress}
            onPressOut={handlePressOut}
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: colors.brand.danger,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              ...({ boxShadow: '0px 8px 24px rgba(239, 68, 68, 0.5)' } as any),
            }}
          >
            {pressStartTime && (
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: progressWidth,
                  backgroundColor: colors.tint.danger.text,
                  borderRadius: 80,
                }}
              />
            )}
            <SLIcon name="siren" size="3xl" color={colors.text.inverse} />
            <Text
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.inverse,
                marginTop: spacing[1],
              }}
            >
              SOS
            </Text>
          </Pressable>

          <Text
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              textAlign: 'center',
              marginTop: spacing[4],
              paddingHorizontal: spacing[6],
            }}
          >
            Press and hold for 3 seconds to activate DZ Emergency
          </Text>
        </View>

        {/* Emergency Profile */}
        <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[6] }}>
          <Text
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.tertiary,
              marginBottom: spacing[4],
              letterSpacing: 1,
            }}
          >
            EMERGENCY PROFILE
          </Text>

          <View style={{ gap: spacing[3] }}>
            {profileItems.map((item) => (
              <View
                key={item.label}
                style={{
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                  padding: spacing[4],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginTop: spacing[1] }}>
                    {item.value}
                  </Text>
                </View>
                <SLIcon name={item.icon} size="lg" color={colors.text.tertiary} />
              </View>
            ))}

            {/* Emergency Contacts */}
            <View
              style={{
                backgroundColor: colors.gray[50],
                borderRadius: 8,
                padding: spacing[4],
              }}
            >
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, marginBottom: spacing[3] }}>
                EMERGENCY CONTACTS
              </Text>
              {emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: idx > 0 ? spacing[3] : 0,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: colors.gray[200],
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        {contact.name}
                      </Text>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                        {contact.phone}
                      </Text>
                    </View>
                    <SLIcon name="phone" size="md" color={colors.text.tertiary} />
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
                  No emergency contacts set. Add them in your profile.
                </Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: spacing[4] }}>
            <SLButton
              label="Edit Emergency Profile"
              onPress={() => router.push('/profile/edit')}
              variant="outline"
              fullWidth
              iconLeft="edit"
            />
          </View>
        </SLCard>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !emergencyMutation.isPending && setShowConfirmation(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => !emergencyMutation.isPending && setShowConfirmation(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: spacing[6],
              marginHorizontal: spacing[6],
              width: '100%',
              maxWidth: 340,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
              <SLIcon name="alert-triangle" size="lg" color={colors.brand.danger} />
              <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.brand.danger }}>
                Confirm Emergency
              </Text>
            </View>

            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing[4], lineHeight: 20 }}>
              This will immediately alert ALL staff and ground ALL loads at {activeDz?.name}.
            </Text>

            <View
              style={{
                backgroundColor: colors.tint.danger.bg,
                borderWidth: 1,
                borderColor: colors.tint.danger.border,
                borderRadius: 8,
                padding: spacing[3],
                marginBottom: spacing[6],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <SLIcon name="alert-triangle" size="sm" color={colors.brand.danger} />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.tint.danger.text, flex: 1 }}>
                This action cannot be undone immediately.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <SLButton
                  label="Cancel"
                  onPress={() => setShowConfirmation(false)}
                  variant="ghost"
                  fullWidth
                  disabled={emergencyMutation.isPending}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SLButton
                  label="Activate"
                  onPress={handleConfirmEmergency}
                  variant="danger"
                  fullWidth
                  loading={emergencyMutation.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
