import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLButton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

type Severity = 'NEAR_MISS' | 'MINOR' | 'MODERATE' | 'SERIOUS';
type Category = 'NEAR_MISS' | 'INJURY' | 'MALFUNCTION' | 'PROPERTY_DAMAGE';

const SEVERITY_OPTIONS: { id: Severity; label: string; color: string; icon: IconName }[] = [
  { id: 'NEAR_MISS', label: 'Near Miss', color: '#EAB308', icon: 'alert-triangle' },
  { id: 'MINOR', label: 'Minor', color: '#F97316', icon: 'alert-circle' },
  { id: 'MODERATE', label: 'Moderate', color: '#EF4444', icon: 'alert-circle' },
  { id: 'SERIOUS', label: 'Serious', color: '#DC2626', icon: 'siren' },
];

const CATEGORY_OPTIONS: { id: Category; label: string; icon: IconName }[] = [
  { id: 'NEAR_MISS', label: 'Near Miss', icon: 'alert-triangle' },
  { id: 'INJURY', label: 'Injury', icon: 'heart' },
  { id: 'MALFUNCTION', label: 'Malfunction', icon: 'wrench' },
  { id: 'PROPERTY_DAMAGE', label: 'Property Damage', icon: 'home' },
];

export default function ReportIncidentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const [severity, setSeverity] = useState<Severity>('NEAR_MISS');
  const [category, setCategory] = useState<Category>('NEAR_MISS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [involvedPeople, setInvolvedPeople] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [showPersonModal, setShowPersonModal] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!activeDz?.id) throw new Error('No active dropzone');
      if (!title.trim() || !description.trim()) {
        throw new Error('Title and description are required');
      }
      await api.post('/incidents', {
        severity,
        category,
        title,
        description,
        involvedParties: involvedPeople,
      });
    },
    onSuccess: () => {
      Alert.alert(
        'Incident Reported',
        'Thank you for reporting. DZ management will review this incident.',
        [{ text: 'OK', onPress: () => { setTitle(''); setDescription(''); setSeverity('NEAR_MISS'); setCategory('NEAR_MISS'); setInvolvedPeople([]); } }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to report incident');
    },
  });

  const addPerson = () => {
    if (personInput.trim()) {
      setInvolvedPeople([...involvedPeople, personInput.trim()]);
      setPersonInput('');
      setShowPersonModal(false);
    }
  };

  const removePerson = (index: number) => {
    setInvolvedPeople(involvedPeople.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Missing Information', 'Please enter an incident title'); return; }
    if (!description.trim()) { Alert.alert('Missing Information', 'Please enter a description'); return; }
    await reportMutation.mutateAsync();
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
            Report Incident
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing[20] || 80 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
          {/* Warning Banner */}
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderWidth: 1,
              borderColor: '#FDE68A',
              borderRadius: 12,
              padding: spacing[4],
              marginBottom: spacing[6],
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            <SLIcon name="clipboard" size="md" color="#92400E" />
            <Text style={{ flex: 1, fontSize: typography.fontSize.sm, color: '#92400E' }}>
              Please provide accurate details. This information will be reviewed by DZ management.
            </Text>
          </View>

          {/* Severity */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3], letterSpacing: 1 }}>
              SEVERITY
            </Text>
            <View style={{ gap: spacing[2] }}>
              {SEVERITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setSeverity(option.id)}
                  style={{
                    padding: spacing[4],
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: severity === option.id ? colors.brand.primary : colors.border,
                    backgroundColor: severity === option.id ? colors.sky[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                    <SLIcon name={option.icon} size="md" color={option.color} />
                    <Text
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: severity === option.id ? typography.fontWeight.bold : typography.fontWeight.semibold,
                        color: severity === option.id ? colors.brand.primary : colors.text.secondary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {severity === option.id && <SLIcon name="check" size="sm" color={colors.brand.primary} />}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3], letterSpacing: 1 }}>
              CATEGORY
            </Text>
            <View style={{ gap: spacing[2] }}>
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setCategory(option.id)}
                  style={{
                    padding: spacing[4],
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: category === option.id ? colors.brand.primary : colors.border,
                    backgroundColor: category === option.id ? colors.sky[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                    <SLIcon name={option.icon} size="md" color={colors.text.secondary} />
                    <Text
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: category === option.id ? typography.fontWeight.bold : typography.fontWeight.semibold,
                        color: category === option.id ? colors.brand.primary : colors.text.secondary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {category === option.id && <SLIcon name="check" size="sm" color={colors.brand.primary} />}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2], letterSpacing: 1 }}>
              INCIDENT TITLE
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Brief summary of incident"
              placeholderTextColor={colors.text.tertiary}
              style={inputStyle}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2], letterSpacing: 1 }}>
              DESCRIPTION
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detailed description of what happened"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ ...inputStyle, minHeight: 120 }}
            />
          </View>

          {/* Involved Parties */}
          <View style={{ marginBottom: spacing[6] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.primary, letterSpacing: 1 }}>
                INVOLVED PARTIES
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>(Optional)</Text>
            </View>

            {involvedPeople.length > 0 && (
              <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
                {involvedPeople.map((person, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: colors.sky[50],
                      borderWidth: 1,
                      borderColor: colors.sky[200],
                      borderRadius: 8,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{person}</Text>
                    <Pressable onPress={() => removePerson(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <SLIcon name="x" size="sm" color={colors.brand.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <SLButton
              label="Add Person"
              onPress={() => setShowPersonModal(true)}
              variant="outline"
              fullWidth
              iconLeft="user-plus"
            />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          paddingBottom: insets.bottom + spacing[4],
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <SLButton
          label="Submit Report"
          onPress={handleSubmit}
          size="lg"
          fullWidth
          loading={reportMutation.isPending}
          disabled={!title.trim() || !description.trim()}
          iconLeft="send"
        />
      </View>

      {/* Add Person Modal */}
      <Modal visible={showPersonModal} transparent animationType="fade" onRequestClose={() => setShowPersonModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowPersonModal(false)}
        >
          <Pressable
            style={{ backgroundColor: colors.surface, borderRadius: 16, padding: spacing[6], marginHorizontal: spacing[6], width: '100%', maxWidth: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
              <SLIcon name="user-plus" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Add Involved Person
              </Text>
            </View>

            <TextInput
              value={personInput}
              onChangeText={setPersonInput}
              placeholder="Name or description"
              placeholderTextColor={colors.text.tertiary}
              style={{ ...inputStyle, marginBottom: spacing[4] }}
            />

            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <SLButton label="Cancel" onPress={() => setShowPersonModal(false)} variant="ghost" fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <SLButton label="Add" onPress={addPerson} fullWidth disabled={!personInput.trim()} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
