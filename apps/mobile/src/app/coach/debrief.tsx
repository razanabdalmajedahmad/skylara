import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SLCard,
  SLIcon,
  SLButton,
} from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';

const SKILLS = [
  { key: 'bodyPosition', label: 'Body Position' },
  { key: 'altitudeAwareness', label: 'Altitude Awareness' },
  { key: 'canopyControl', label: 'Canopy Control' },
  { key: 'freefall', label: 'Freefall Stability' },
  { key: 'landingPattern', label: 'Landing Pattern' },
  { key: 'emergencyProcedures', label: 'Emergency Procedures' },
] as const;

const SESSION_TYPES = ['TANDEM', 'AFF', 'COACHING'] as const;

interface DebriefPayload {
  sessionType: string;
  studentName: string;
  date: string;
  rating: number;
  skills: Record<string, boolean>;
  notes: string;
}

export default function DebriefForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const queryClient = useQueryClient();

  const [studentName, setStudentName] = useState('');
  const [sessionType, setSessionType] = useState<string>('COACHING');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(0);
  const [skills, setSkills] = useState<Record<string, boolean>>(
    Object.fromEntries(SKILLS.map((s) => [s.key, false])),
  );
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitMutation = useMutation({
    mutationFn: async (payload: DebriefPayload) => {
      const endpoint = sessionId
        ? `/coaching/sessions/${sessionId}/debrief`
        : '/coaching/sessions/debrief';
      const res = await api.post(endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-sessions'] });
      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert('Success', 'Debrief submitted successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    },
    onError: () => {
      if (Platform.OS === 'web') {
        // fallback for web
      } else {
        Alert.alert('Error', 'Failed to submit debrief. Please try again.');
      }
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!studentName.trim()) errs.studentName = 'Student name is required';
    if (rating === 0) errs.rating = 'Rating is required';
    if (!date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    submitMutation.mutate({
      sessionType,
      studentName: studentName.trim(),
      date,
      rating,
      skills,
      notes: notes.trim(),
    });
  };

  const toggleSkill = (key: string) => {
    setSkills((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Jump Debrief
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Student Name */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Student
        </Text>
        <TextInput
          value={studentName}
          onChangeText={setStudentName}
          placeholder="Enter student name"
          placeholderTextColor={colors.text.tertiary}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: errors.studentName ? colors.status.error : colors.border,
            borderRadius: radii.lg,
            padding: spacing[3],
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            marginBottom: spacing[1],
          }}
        />
        {errors.studentName && (
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.status.error, marginBottom: spacing[3] }}>
            {errors.studentName}
          </Text>
        )}
        {!errors.studentName && <View style={{ marginBottom: spacing[4] }} />}

        {/* Session Type */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Session Type
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
          {SESSION_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setSessionType(type)}
              style={{
                flex: 1,
                paddingVertical: spacing[2],
                borderRadius: radii.full,
                backgroundColor: sessionType === type ? colors.brand.primary : colors.gray[100],
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: sessionType === type ? colors.text.inverse : colors.text.secondary,
                }}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Date */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Date
        </Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text.tertiary}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: errors.date ? colors.status.error : colors.border,
            borderRadius: radii.lg,
            padding: spacing[3],
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            marginBottom: spacing[4],
          }}
        />

        {/* Rating */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Rating
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[1] }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <SLIcon
                name="star"
                size="lg"
                color={star <= rating ? colors.brand.secondary : colors.gray[200]}
              />
            </Pressable>
          ))}
        </View>
        {errors.rating && (
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.status.error, marginBottom: spacing[3] }}>
            {errors.rating}
          </Text>
        )}
        {!errors.rating && <View style={{ marginBottom: spacing[4] }} />}

        {/* Skills Assessment */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Skills Assessment
        </Text>
        <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
          {SKILLS.map((skill, idx) => (
            <Pressable
              key={skill.key}
              onPress={() => toggleSkill(skill.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing[3],
                borderBottomWidth: idx < SKILLS.length - 1 ? 1 : 0,
                borderBottomColor: colors.gray[100],
              }}
            >
              <Text style={{ fontSize: typography.fontSize.base, color: colors.text.primary }}>
                {skill.label}
              </Text>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: skills[skill.key] ? colors.brand.primary : colors.gray[300],
                  backgroundColor: skills[skill.key] ? colors.brand.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {skills[skill.key] && (
                  <SLIcon name="check" size="sm" color={colors.text.inverse} />
                )}
              </View>
            </Pressable>
          ))}
        </SLCard>

        {/* Notes */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
          Notes
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional notes about the session..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: spacing[3],
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            minHeight: 100,
            marginBottom: spacing[6],
          }}
        />

        {/* Submit */}
        <SLButton
          label={submitMutation.isPending ? 'Submitting...' : 'Submit Debrief'}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          disabled={submitMutation.isPending}
        />
      </ScrollView>
    </View>
  );
}
