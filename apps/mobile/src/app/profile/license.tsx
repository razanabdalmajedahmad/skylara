import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { SLIcon, SLButton, SLCard } from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';

const LICENSE_LEVELS = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'None', value: 'NONE' },
];

const DISCIPLINES = [
  'FS (Freefall)',
  'Freefly',
  'Wingsuit',
  'CRW',
  'Angle',
  'Tracking',
  'Canopy Piloting',
  'Accuracy',
  'Speed',
  'Tandem',
  'AFF Instructor',
];

export default function LicenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();

  // Form state
  const [licenseLevel, setLicenseLevel] = useState('STUDENT');
  const [uspaId, setUspaId] = useState('');
  const [totalJumps, setTotalJumps] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [canopySize, setCanopySize] = useState('');
  const [exitWeight, setExitWeight] = useState('');
  const [wingLoading, setWingLoading] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLicensePicker, setShowLicensePicker] = useState(false);
  const [showDisciplinePicker, setShowDisciplinePicker] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (user?.athlete) {
      setLicenseLevel(user.athlete.licenseLevel || 'STUDENT');
      setTotalJumps(user.athlete.totalJumps?.toString() || '');
      setUspaId(user.athlete?.uspaId || '');
      setSelectedDisciplines(user.athlete?.disciplines || []);
    }
  }, [user]);

  // Calculate wing loading whenever canopy or exit weight changes
  useEffect(() => {
    if (canopySize && exitWeight) {
      const size = parseInt(canopySize, 10);
      const weight = parseInt(exitWeight, 10);
      if (size > 0 && weight > 0) {
        const loading = (weight / size).toFixed(2);
        setWingLoading(loading);
      }
    } else {
      setWingLoading('');
    }
  }, [canopySize, exitWeight]);

  const toggleDiscipline = (discipline: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(discipline) ? prev.filter((d) => d !== discipline) : [...prev, discipline]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        licenseLevel,
        uspaId: uspaId.trim() || undefined,
        totalJumps: totalJumps ? parseInt(totalJumps, 10) : undefined,
        disciplines: selectedDisciplines,
      };

      await api.patch('/jumpers/me/athlete', payload);
      await refreshUser();
      Alert.alert('Success', 'License & skills updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update license info');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  };

  const labelStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.secondary,
    marginBottom: spacing[2],
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
            License & Skills
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {/* License & Certification Section */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="award" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              License & Certification
            </Text>
          </View>

          {/* License Level Picker */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>License Level</Text>
            <Pressable
              onPress={() => setShowLicensePicker(true)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.gray[100] : colors.gray[50],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              })}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                {LICENSE_LEVELS.find((l) => l.value === licenseLevel)?.label}
              </Text>
              <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
            </Pressable>
          </View>

          {/* USPA ID */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>USPA Member ID</Text>
            <TextInput
              style={inputStyle}
              placeholder="123456"
              value={uspaId}
              onChangeText={setUspaId}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Total Jumps */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={labelStyle}>Total Jumps</Text>
            <TextInput
              style={inputStyle}
              placeholder="0"
              value={totalJumps}
              onChangeText={setTotalJumps}
              keyboardType="number-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Disciplines Section */}
        <View style={{ paddingHorizontal: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <SLIcon name="target" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Disciplines
              </Text>
            </View>
            <Pressable
              onPress={() => setShowDisciplinePicker(!showDisciplinePicker)}
              style={{
                backgroundColor: colors.sky[50],
                borderRadius: 8,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
              }}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
                {showDisciplinePicker ? 'Done' : 'Select'}
              </Text>
            </Pressable>
          </View>

          {showDisciplinePicker && (
            <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
              <View style={{ gap: spacing[2] }}>
                {DISCIPLINES.map((discipline) => {
                  const isSelected = selectedDisciplines.includes(discipline);
                  return (
                    <Pressable
                      key={discipline}
                      onPress={() => toggleDiscipline(discipline)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing[3],
                        padding: spacing[3],
                        borderRadius: 8,
                        backgroundColor: isSelected ? colors.sky[50] : colors.surface,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.sky[200] : colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: isSelected ? colors.brand.primary : colors.gray[300],
                          backgroundColor: isSelected ? colors.brand.primary : colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <SLIcon name="check" size="xs" color={colors.text.inverse} />}
                      </View>
                      <Text
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: isSelected ? typography.fontWeight.semibold : typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        {discipline}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SLCard>
          )}

          {!showDisciplinePicker && selectedDisciplines.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[6] }}>
              {selectedDisciplines.map((discipline) => (
                <View
                  key={discipline}
                  style={{
                    backgroundColor: colors.sky[100],
                    borderRadius: radii.full,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                  }}
                >
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.sky[700] }}>
                    {discipline}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!showDisciplinePicker && selectedDisciplines.length === 0 && (
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginBottom: spacing[6] }}>
              No disciplines selected. Tap "Select" to choose your disciplines.
            </Text>
          )}
        </View>

        {/* Wing Loading Calculator */}
        <View style={{ paddingHorizontal: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="calculator" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Wing Loading Calculator
            </Text>
          </View>

          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Canopy Size (sq ft)</Text>
            <TextInput
              style={inputStyle}
              placeholder="170"
              value={canopySize}
              onChangeText={setCanopySize}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Exit Weight (lbs)</Text>
            <TextInput
              style={inputStyle}
              placeholder="200"
              value={exitWeight}
              onChangeText={setExitWeight}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {wingLoading ? (
            <View
              style={{
                backgroundColor: colors.sky[50],
                borderWidth: 1,
                borderColor: colors.sky[200],
                borderRadius: 12,
                padding: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing[1] }}>
                  Wing Loading
                </Text>
                <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>
                  {wingLoading} lbs/sq ft
                </Text>
              </View>
              <SLIcon name="info" size="md" color={colors.brand.primary} />
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8], gap: spacing[3] }}>
          <SLButton
            label="Save Information"
            onPress={handleSave}
            size="lg"
            fullWidth
            loading={isSaving}
            iconLeft="check"
          />
          <SLButton
            label="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>

      {/* License Level Picker Modal */}
      <Modal
        visible={showLicensePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLicensePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowLicensePicker(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              width: 320,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <SLIcon name="award" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Select License Level
              </Text>
            </View>
            <FlatList
              data={LICENSE_LEVELS}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setLicenseLevel(item.value);
                    setShowLicensePicker(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderTopWidth: 1,
                    borderTopColor: colors.gray[100],
                    backgroundColor: licenseLevel === item.value ? colors.sky[50] : pressed ? colors.gray[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  })}
                >
                  <Text
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: licenseLevel === item.value ? typography.fontWeight.semibold : typography.fontWeight.medium,
                      color: licenseLevel === item.value ? colors.brand.primary : colors.text.primary,
                    }}
                  >
                    {item.label}
                  </Text>
                  {licenseLevel === item.value && (
                    <SLIcon name="check" size="sm" color={colors.brand.primary} />
                  )}
                </Pressable>
              )}
              keyExtractor={(item) => item.value}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
