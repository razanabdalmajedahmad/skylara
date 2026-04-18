import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCreateLogbookEntry, useLogbook } from '@/hooks/useLogbook';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLButton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const JUMP_TYPES = [
  { value: 'BELLY', label: 'Belly' },
  { value: 'FREEFLY', label: 'Freefly' },
  { value: 'ANGLE', label: 'Angle' },
  { value: 'WINGSUIT', label: 'Wingsuit' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'HOP_N_POP', label: 'Hop & Pop' },
  { value: 'CRW', label: 'CRW' },
  { value: 'TANDEM', label: 'Tandem' },
  { value: 'AFF', label: 'AFF' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'DEMO', label: 'Demo' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'WATER', label: 'Water Training' },
  { value: 'CAMERA', label: 'Camera' },
] as const;

const DISCIPLINE_OPTIONS = [
  '4-way FS', '8-way FS', '16-way FS', 'Head Down', 'Head Up',
  '4-way VFS', 'Dynamic', 'Angle', 'Tracking', 'Wingsuit',
  'Canopy Piloting', 'Accuracy', 'Speed', 'CRW', 'Camera',
] as const;

// Dropzone options are loaded from the user's real dropzone store (no more hardcoded list)

const inputStyle = {
  backgroundColor: colors.gray[50],
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[3],
  fontSize: typography.fontSize.base,
  fontWeight: typography.fontWeight.semibold as any,
  color: colors.text.primary,
};

export default function AddJumpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: logbookData } = useLogbook({ limit: 1 });
  const { mutate: createEntry, isPending: isSaving } = useCreateLogbookEntry();
  const { dropzones: dzList, activeDz } = useDropzoneStore();

  const nextJumpNumber = useMemo(() => {
    if (logbookData?.entries && logbookData.entries.length > 0) {
      return logbookData.entries[0].jumpNumber + 1;
    }
    return 1;
  }, [logbookData?.entries]);

  const [jumpNumber, setJumpNumber] = useState(String(nextJumpNumber));
  const [jumpType, setJumpType] = useState('BELLY');
  const [altitude, setAltitude] = useState('13500');
  const [freefallTime, setFreefallTime] = useState('');
  const [deploymentAltitude, setDeploymentAltitude] = useState('3500');
  const [canopySize, setCanopySize] = useState('150');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [dropzone, setDropzone] = useState(activeDz?.name || 'Select Dropzone');
  const [dropzoneId, setDropzoneId] = useState(activeDz?.id || 0);

  const [showJumpTypePicker, setShowJumpTypePicker] = useState(false);
  const [showDropzonePicker, setShowDropzonePicker] = useState(false);

  const jumpTypeLabel = useMemo(() => {
    return JUMP_TYPES.find((jt) => jt.value === jumpType)?.label || jumpType;
  }, [jumpType]);

  const toggleDiscipline = (disc: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(disc) ? prev.filter((d) => d !== disc) : [...prev, disc]
    );
  };

  const validateForm = (): boolean => {
    if (!jumpNumber.trim() || isNaN(Number(jumpNumber))) {
      Alert.alert('Validation', 'Please enter a valid jump number.');
      return false;
    }
    if (!altitude.trim() || isNaN(Number(altitude))) {
      Alert.alert('Validation', 'Please enter a valid altitude.');
      return false;
    }
    if (freefallTime.trim() && isNaN(Number(freefallTime))) {
      Alert.alert('Validation', 'Please enter a valid freefall time in seconds.');
      return false;
    }
    if (deploymentAltitude.trim() && isNaN(Number(deploymentAltitude))) {
      Alert.alert('Validation', 'Please enter a valid deployment altitude.');
      return false;
    }
    if (canopySize.trim() && isNaN(Number(canopySize))) {
      Alert.alert('Validation', 'Please enter a valid canopy size.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const payload = {
      jumpNumber: Number(jumpNumber),
      jumpType,
      altitude: altitude ? Number(altitude) : undefined,
      freefallTime: freefallTime ? Number(freefallTime) : undefined,
      deploymentAltitude: deploymentAltitude ? Number(deploymentAltitude) : undefined,
      canopySize: canopySize ? Number(canopySize) : undefined,
      disciplines: selectedDisciplines,
      notes: notes.trim() || undefined,
      dropzoneId,
    };

    createEntry(payload, {
      onSuccess: (createdEntry: any) => {
        Alert.alert('Success', `Jump #${createdEntry.jumpNumber} has been logged!`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      onError: (error: any) => {
        Alert.alert('Error', error?.message || 'Failed to save jump. Please try again.');
      },
    });
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    icon: IconName,
    data: readonly { value: string; label: string }[] | readonly string[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[6] }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name={icon} size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {title}
            </Text>
          </View>
          <FlatList
            data={data as any[]}
            keyExtractor={(item) => (typeof item === 'string' ? item : item.value)}
            scrollEnabled={true}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const value = typeof item === 'string' ? item : item.value;
              const label = typeof item === 'string' ? item : item.label;
              const isActive = value === selectedValue;
              return (
                <Pressable
                  onPress={() => { onSelect(value); onClose(); }}
                  style={{
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[4],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.gray[100],
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isActive ? colors.sky[50] : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: isActive ? typography.fontWeight.bold : typography.fontWeight.medium,
                    color: isActive ? colors.brand.primary : colors.text.primary,
                  }}>
                    {label}
                  </Text>
                  {isActive && <SLIcon name="check" size="sm" color={colors.brand.primary} />}
                </Pressable>
              );
            }}
          />
          <View style={{ marginTop: spacing[4] }}>
            <SLButton label="Close" onPress={onClose} variant="ghost" fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.brand.primary }}>
              Cancel
            </Text>
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Log Jump
          </Text>
          <View style={{ width: 56 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[6] }}>
            {/* Jump Number */}
            <FormField label="Jump Number" icon="hash">
              <TextInput
                value={jumpNumber}
                onChangeText={setJumpNumber}
                keyboardType="number-pad"
                placeholder="248"
                placeholderTextColor={colors.text.tertiary}
                style={inputStyle}
              />
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }}>
                Auto-suggested based on your last jump
              </Text>
            </FormField>

            {/* Jump Type */}
            <FormField label="Jump Type" icon="plane">
              <Pressable
                onPress={() => setShowJumpTypePicker(true)}
                style={{
                  ...inputStyle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {jumpTypeLabel}
                </Text>
                <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
              </Pressable>
            </FormField>

            {/* Altitude */}
            <FormField label="Altitude (feet)" icon="arrow-up">
              <TextInput
                value={altitude}
                onChangeText={setAltitude}
                keyboardType="number-pad"
                placeholder="13500"
                placeholderTextColor={colors.text.tertiary}
                style={inputStyle}
              />
            </FormField>

            {/* Freefall Time */}
            <FormField label="Freefall Time (seconds)" icon="clock">
              <TextInput
                value={freefallTime}
                onChangeText={setFreefallTime}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.text.tertiary}
                style={inputStyle}
              />
            </FormField>

            {/* Deployment Altitude */}
            <FormField label="Deployment Altitude (feet)" icon="wind">
              <TextInput
                value={deploymentAltitude}
                onChangeText={setDeploymentAltitude}
                keyboardType="number-pad"
                placeholder="3500"
                placeholderTextColor={colors.text.tertiary}
                style={inputStyle}
              />
            </FormField>

            {/* Canopy Size */}
            <FormField label="Canopy Size (sq ft)" icon="target">
              <TextInput
                value={canopySize}
                onChangeText={setCanopySize}
                keyboardType="number-pad"
                placeholder="150"
                placeholderTextColor={colors.text.tertiary}
                style={inputStyle}
              />
            </FormField>

            {/* Disciplines */}
            <FormField label="Disciplines" icon="award">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                {DISCIPLINE_OPTIONS.map((disc) => {
                  const isSelected = selectedDisciplines.includes(disc);
                  return (
                    <Pressable
                      key={disc}
                      onPress={() => toggleDiscipline(disc)}
                      style={{
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.brand.primary : colors.border,
                        backgroundColor: isSelected ? colors.brand.primary : colors.surface,
                      }}
                    >
                      <Text style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: isSelected ? colors.text.inverse : colors.text.secondary,
                      }}>
                        {disc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </FormField>

            {/* Dropzone */}
            <FormField label="Dropzone" icon="map-pin">
              <Pressable
                onPress={() => setShowDropzonePicker(true)}
                style={{
                  ...inputStyle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: typography.fontSize.base, color: colors.text.primary }}>
                  {dropzone}
                </Text>
                <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
              </Pressable>
            </FormField>

            {/* Notes */}
            <FormField label="Notes" icon="edit">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="How was the jump? Formation work, canopy notes, coaching feedback..."
                placeholderTextColor={colors.text.tertiary}
                style={{ ...inputStyle, minHeight: 120 }}
              />
            </FormField>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[4],
            paddingBottom: insets.bottom + spacing[4],
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <SLButton
            label={isSaving ? 'Saving...' : 'Save Jump'}
            onPress={handleSave}
            fullWidth
            size="lg"
            loading={isSaving}
            disabled={isSaving}
            iconLeft="check"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Jump Type Picker */}
      {renderPickerModal(
        showJumpTypePicker,
        () => setShowJumpTypePicker(false),
        'Select Jump Type',
        'plane',
        JUMP_TYPES,
        jumpType,
        setJumpType,
      )}

      {/* Dropzone Picker */}
      {renderPickerModal(
        showDropzonePicker,
        () => setShowDropzonePicker(false),
        'Select Dropzone',
        'map-pin',
        (dzList.length > 0
          ? dzList.map((dz) => ({ value: dz.name, label: dz.name }))
          : [{ value: activeDz?.name || 'No dropzones', label: activeDz?.name || 'No dropzones' }]),
        dropzone,
        (val: string) => {
          setDropzone(val);
          const found = dzList.find((d) => d.name === val);
          if (found) setDropzoneId(found.id);
        },
      )}
    </View>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        {icon && <SLIcon name={icon} size="sm" color={colors.text.secondary} />}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}
