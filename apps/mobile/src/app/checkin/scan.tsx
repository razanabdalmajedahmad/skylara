import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

// expo-camera and expo-haptics are native-only; load dynamically for web safety.
let CameraView: any = null;
let useCameraPermissions: any = null;
let Haptics: any = null;

try {
  if (Platform.OS !== 'web') {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    useCameraPermissions = cameraModule.useCameraPermissions;
    Haptics = require('expo-haptics');
  }
} catch {
  // Packages not installed
}

const safeHaptics = {
  notificationAsync: async (_type?: any) => {},
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
};
const HapticsModule = Haptics || safeHaptics;

type CheckinState = 'scanning' | 'processing' | 'success' | 'error' | 'manual_entry' | 'already_checked_in';

interface QRPayload {
  type: string;
  dzId: number;
  branchId?: number;
}

export default function CheckinScanScreen() {
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();

  const cameraPerms = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const [permission, requestPermission] = cameraPerms;

  const [state, setState] = useState<CheckinState>(Platform.OS === 'web' ? 'manual_entry' : 'scanning');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const validateQRPayload = (payload: QRPayload): boolean => {
    if (payload.type !== 'DZ_CHECKIN') {
      setErrorMessage('Invalid QR code: wrong type');
      return false;
    }
    if (!payload.dzId || typeof payload.dzId !== 'number') {
      setErrorMessage('Invalid QR code: missing dropzone ID');
      return false;
    }
    if (activeDz && payload.dzId !== activeDz.id) {
      setErrorMessage(`QR code is for a different dropzone (${payload.dzId})`);
      return false;
    }
    return true;
  };

  const performCheckin = async (dzId: number) => {
    if (!dzId) { setErrorMessage('No dropzone selected'); return; }
    setIsLoading(true);
    setState('processing');

    try {
      const response = await api.post(`/dz/${dzId}/jumpers/me/checkin`, {});
      if (response.status === 200) {
        await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Success);
        setSuccessMessage('Check-in successful!');
        setState('success');
        setTimeout(() => { setState(Platform.OS === 'web' ? 'manual_entry' : 'scanning'); setScanned(false); setSuccessMessage(''); }, 2000);
      }
    } catch (error: any) {
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error);
      if (error.response?.status === 409) {
        setErrorMessage('You are already checked in');
        setState('already_checked_in');
      } else {
        setErrorMessage(error.response?.data?.message || error.message || 'Check-in failed. Please try again.');
        setState('error');
      }
      setTimeout(() => { setState(Platform.OS === 'web' ? 'manual_entry' : 'scanning'); setScanned(false); setErrorMessage(''); }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isLoading) return;
    setScanned(true);
    try {
      const payload: QRPayload = JSON.parse(data);
      if (!validateQRPayload(payload)) {
        setState('error');
        await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Warning);
        setTimeout(() => { setState('scanning'); setScanned(false); setErrorMessage(''); }, 3000);
        return;
      }
      await performCheckin(payload.dzId);
    } catch {
      setErrorMessage('Failed to parse QR code');
      setState('error');
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Warning);
      setTimeout(() => { setState('scanning'); setScanned(false); setErrorMessage(''); }, 3000);
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) { Alert.alert('Error', 'Please enter a check-in code'); return; }
    setManualCode('');
    const dzId = activeDz?.id;
    if (!dzId) { Alert.alert('Error', 'No dropzone selected'); return; }
    await performCheckin(dzId);
  };

  const handleCheckout = async () => {
    if (!activeDz?.id) { Alert.alert('Error', 'No dropzone selected'); return; }
    setIsLoading(true);
    try {
      await api.post(`/dz/${activeDz.id}/jumpers/me/checkout`, {});
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Success);
      setSuccessMessage('Checked out successfully!');
      setState(Platform.OS === 'web' ? 'manual_entry' : 'scanning');
      setTimeout(() => { setSuccessMessage(''); }, 2000);
    } catch (error: any) {
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Permission denied (native)
  if (Platform.OS !== 'web' && permission === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.sky[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] }}>
          <SLIcon name="camera" size="lg" color={colors.brand.primary} />
        </View>
        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Camera Permission Required
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[6] }}>
          We need camera access to scan QR codes for check-in. Please enable it in your settings.
        </Text>
        <SLButton label="Enable Camera" onPress={requestPermission} iconLeft="camera" />
      </View>
    );
  }

  // Loading permission (native)
  if (Platform.OS !== 'web' && (!permission || permission === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <SLIcon name="camera" size="lg" color={colors.brand.primary} />
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[3] }}>Loading camera...</Text>
      </View>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6], paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.tint.success.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] }}>
          <SLIcon name="check-circle" size="lg" color={colors.brand.success} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Check-In Complete
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[6] }}>
          {successMessage}
        </Text>
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontStyle: 'italic' }}>
          Returning to scanner...
        </Text>
      </View>
    );
  }

  // Already checked in
  if (state === 'already_checked_in') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6], paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sky[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] }}>
          <SLIcon name="check" size="lg" color={colors.brand.primary} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Already Checked In
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[6] }}>
          You are currently checked in at {activeDz?.name}
        </Text>

        <View style={{ width: '100%', gap: spacing[3] }}>
          <SLButton label="Check Out" onPress={handleCheckout} fullWidth loading={isLoading} iconLeft="log-out" />
          <SLButton
            label="Back to Scanner"
            onPress={() => setState(Platform.OS === 'web' ? 'manual_entry' : 'scanning')}
            variant="outline"
            fullWidth
            disabled={isLoading}
          />
        </View>
      </View>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6], paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.tint.danger.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] }}>
          <SLIcon name="x-circle" size="lg" color={colors.brand.danger} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Check-In Failed
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.brand.danger, textAlign: 'center', fontWeight: typography.fontWeight.medium, marginBottom: spacing[2] }}>
          {errorMessage}
        </Text>
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontStyle: 'italic' }}>
          Returning to scanner...
        </Text>
      </View>
    );
  }

  // Manual entry
  if (state === 'manual_entry') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing[6], paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[4] }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
            <SLIcon name="keyboard" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Manual Entry
            </Text>
          </View>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing[6] }}>
            Enter your check-in code below
          </Text>

          <TextInput
            placeholder="Enter check-in code"
            value={manualCode}
            onChangeText={setManualCode}
            placeholderTextColor={colors.text.tertiary}
            style={{
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              marginBottom: spacing[4],
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleManualEntry}
          />

          <View style={{ gap: spacing[3] }}>
            <SLButton
              label="Check In"
              onPress={handleManualEntry}
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!manualCode.trim()}
              iconLeft="check"
            />

            {Platform.OS !== 'web' && CameraView && (
              <SLButton
                label="Back to Scanner"
                onPress={() => { setState('scanning'); setManualCode(''); }}
                variant="outline"
                fullWidth
                disabled={isLoading}
                iconLeft="camera"
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  // Scanning state (native only)
  if (!CameraView) {
    setState('manual_entry');
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={isLoading || scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        {/* Overlay */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <View style={{ width: 288, height: 288, borderWidth: 4, borderColor: colors.brand.primary, borderRadius: 24, backgroundColor: 'transparent' }} />

          <Text style={{ position: 'absolute', bottom: 128, color: '#FFF', textAlign: 'center', fontWeight: typography.fontWeight.semibold, paddingHorizontal: spacing[6] }}>
            Position QR code within the frame
          </Text>
        </View>

        {/* Bottom action */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing[6], paddingVertical: spacing[6], paddingBottom: insets.bottom + spacing[6], gap: spacing[2] }}>
          <Pressable
            onPress={() => setState('manual_entry')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              paddingHorizontal: spacing[6],
              paddingVertical: spacing[3],
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: typography.fontWeight.semibold }}>
              Or Enter Code Manually
            </Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
