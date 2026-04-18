import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { SLIcon, SLButton } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const GEAR_TYPES = [
  'Container',
  'Main',
  'Reserve',
  'AAD',
  'Helmet',
  'Altimeter',
  'Suit',
];

const GEAR_COLORS = [
  'Black',
  'White',
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Purple',
  'Silver',
  'Gold',
];

const STATUS_OPTIONS = ['Active', 'Grounded', 'In Repair'];

interface GearCheck {
  id: number;
  date: string;
  type: string;
  notes?: string;
}

export default function GearDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ gearId: string }>();
  const gearId = params?.gearId;

  // Form state
  const [type, setType] = useState('Container');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('Black');
  const [dom, setDom] = useState('');
  const [jumpsOnGear, setJumpsOnGear] = useState('0');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');
  const [inspectionHistory, setInspectionHistory] = useState<GearCheck[]>([]);
  const [nextRepackDate, setNextRepackDate] = useState<string | null>(null);
  const [aadExpiryDate, setAadExpiryDate] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const loadGearDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/jumpers/me/gear/${gearId}`);
      setType(data.type || 'Container');
      setBrand(data.brand || '');
      setModel(data.model || '');
      setSerialNumber(data.serialNumber || '');
      setSize(data.size || '');
      setColor(data.color || 'Black');
      setDom(data.dom || '');
      setJumpsOnGear(data.jumpsOnGear?.toString() || '0');
      setStatus(data.status || 'Active');
      setNotes(data.notes || '');
      setInspectionHistory(data.inspectionHistory || []);

      if (data.lastRePack) {
        const repackDate = new Date(data.lastRePack);
        const nextDate = new Date(repackDate);
        nextDate.setDate(nextDate.getDate() + 180);
        setNextRepackDate(nextDate.toISOString().split('T')[0]);
      }

      if (data.aadExpiryDate) {
        setAadExpiryDate(data.aadExpiryDate.split('T')[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load gear details');
    } finally {
      setIsLoading(false);
    }
  }, [gearId]);

  useEffect(() => {
    if (gearId) {
      void loadGearDetail();
    }
  }, [gearId, loadGearDetail]);

  const handleSave = async () => {
    if (!brand.trim() || !model.trim() || !serialNumber.trim()) {
      Alert.alert('Error', 'Brand, model, and serial number are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        type,
        brand: brand.trim(),
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        size: size.trim() || undefined,
        color: color.trim(),
        dom: dom.trim() || undefined,
        jumpsOnGear: parseInt(jumpsOnGear, 10),
        status,
        notes: notes.trim() || undefined,
      };

      if (gearId) {
        await api.patch(`/jumpers/me/gear/${gearId}`, payload);
        Alert.alert('Success', 'Gear updated successfully');
      } else {
        await api.post('/jumpers/me/gear', payload);
        Alert.alert('Success', 'Gear added successfully');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save gear');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!gearId) return;

    Alert.alert('Delete Gear', 'Are you sure you want to delete this gear item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jumpers/me/gear/${gearId}`);
            Alert.alert('Success', 'Gear deleted');
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete gear');
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6] }}>
        <SLSkeleton width={200} height={24} />
        <View style={{ marginTop: spacing[6], gap: spacing[4] }}>
          <SLSkeleton width="100%" height={48} />
          <SLSkeleton width="100%" height={48} />
          <SLSkeleton width="100%" height={48} />
          <SLSkeleton width="100%" height={48} />
        </View>
      </View>
    );
  }

  // Helper to render a picker row
  const renderPickerRow = (label: string, value: string, onPress: () => void) => (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={labelStyle}>{label}</Text>
      <Pressable
        onPress={onPress}
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
          {value}
        </Text>
        <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
      </Pressable>
    </View>
  );

  // Helper to render a picker modal
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: string[],
    selected: string,
    onSelect: (val: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            width: 320,
            overflow: 'hidden',
            maxHeight: 400,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[4], fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            {title}
          </Text>
          <FlatList
            data={data}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  borderTopWidth: 1,
                  borderTopColor: colors.gray[100],
                  backgroundColor: selected === item ? colors.sky[50] : pressed ? colors.gray[50] : colors.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                })}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: selected === item ? typography.fontWeight.semibold : typography.fontWeight.medium,
                    color: selected === item ? colors.brand.primary : colors.text.primary,
                  }}
                >
                  {item}
                </Text>
                {selected === item && (
                  <SLIcon name="check" size="sm" color={colors.brand.primary} />
                )}
              </Pressable>
            )}
            keyExtractor={(item) => item}
          />
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
            {gearId ? 'Edit Gear' : 'Add Gear'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
          {/* Gear Type */}
          {renderPickerRow('Gear Type', type, () => setShowTypePicker(true))}

          {/* Brand */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Brand</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g., Vector, Mirage, Javelin"
              value={brand}
              onChangeText={setBrand}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Model */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Model</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g., 3, IV, Sigma"
              value={model}
              onChangeText={setModel}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Serial Number */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Serial Number</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g., VS123456"
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Size */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Size (sq ft)</Text>
            <TextInput
              style={inputStyle}
              placeholder="170"
              value={size}
              onChangeText={setSize}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Color */}
          {renderPickerRow('Color', color, () => setShowColorPicker(true))}

          {/* Date of Manufacture */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Date of Manufacture</Text>
            <TextInput
              style={inputStyle}
              placeholder="YYYY-MM-DD"
              value={dom}
              onChangeText={setDom}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Jumps on Gear */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Jumps on This Gear</Text>
            <TextInput
              style={inputStyle}
              placeholder="0"
              value={jumpsOnGear}
              onChangeText={setJumpsOnGear}
              keyboardType="number-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Status */}
          {renderPickerRow('Status', status, () => setShowStatusPicker(true))}

          {/* Notes */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Notes</Text>
            <TextInput
              style={{
                ...inputStyle,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Important Dates */}
          {nextRepackDate && (
            <View
              style={{
                backgroundColor: colors.sky[50],
                borderWidth: 1,
                borderColor: colors.sky[200],
                borderRadius: 12,
                padding: spacing[4],
                marginBottom: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Next Repack Due</Text>
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>
                  {formatDate(nextRepackDate)}
                </Text>
              </View>
              <SLIcon name="calendar" size="md" color={colors.brand.primary} />
            </View>
          )}

          {aadExpiryDate && (
            <View
              style={{
                backgroundColor: colors.tint.orange.bg,
                borderWidth: 1,
                borderColor: colors.tint.orange.border,
                borderRadius: 12,
                padding: spacing[4],
                marginBottom: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>AAD Expiry Date</Text>
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.tint.orange.text }}>
                  {formatDate(aadExpiryDate)}
                </Text>
              </View>
              <SLIcon name="alert-triangle" size="md" color={colors.tint.orange.text} />
            </View>
          )}

          {/* Inspection History */}
          {inspectionHistory.length > 0 && (
            <View style={{ marginBottom: spacing[4] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                <SLIcon name="clipboard" size="md" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                  Inspection History
                </Text>
              </View>
              <View style={{ gap: spacing[2] }}>
                {inspectionHistory.map((check) => (
                  <View
                    key={check.id}
                    style={{
                      backgroundColor: colors.gray[50],
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: spacing[3],
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                        {check.type}
                      </Text>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                        {formatDate(check.date)}
                      </Text>
                    </View>
                    {check.notes && (
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                        {check.notes}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[4], gap: spacing[3] }}>
          <SLButton
            label={gearId ? 'Update Gear' : 'Add Gear'}
            onPress={handleSave}
            size="lg"
            fullWidth
            loading={isSaving}
            iconLeft="check"
          />

          {gearId && (
            <SLButton
              label="Delete Gear"
              onPress={handleDelete}
              variant="danger"
              size="lg"
              fullWidth
              iconLeft="trash"
            />
          )}

          <SLButton
            label="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Picker Modals */}
      {renderPickerModal(showTypePicker, () => setShowTypePicker(false), 'Select Gear Type', GEAR_TYPES, type, setType)}
      {renderPickerModal(showColorPicker, () => setShowColorPicker(false), 'Select Color', GEAR_COLORS, color, setColor)}
      {renderPickerModal(showStatusPicker, () => setShowStatusPicker(false), 'Select Status', STATUS_OPTIONS, status, setStatus)}
    </View>
  );
}
