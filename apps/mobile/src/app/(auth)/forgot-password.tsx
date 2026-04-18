import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { SLIcon, SLButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const inputStyle = {
  backgroundColor: colors.gray[50],
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[3],
  borderRadius: 8,
  fontSize: typography.fontSize.base,
  color: colors.text.primary,
  borderWidth: 1,
  borderColor: colors.border,
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { control, handleSubmit, formState: { errors }, watch } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: insets.top + spacing[10], paddingBottom: insets.bottom + spacing[8], justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.tint.success.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[6] }}>
              <SLIcon name="check-circle" size="lg" color={colors.brand.success} />
            </View>

            <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[4], textAlign: 'center' }}>
              Check Your Email
            </Text>

            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing[8] }}>
              We've sent a password reset link to{'\n'}
              <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{emailValue}</Text>
            </Text>

            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing[8] }}>
              Click the link in the email to reset your password. If you don't see the email, check your spam folder.
            </Text>

            <View style={{ width: '100%', gap: spacing[3] }}>
              <SLButton label="Back to Login" onPress={() => setSubmitted(false)} fullWidth iconLeft="arrow-left" />
              <SLButton label="Resend Email" onPress={() => onSubmit({ email: emailValue })} variant="outline" fullWidth iconLeft="refresh" />
            </View>
          </View>

          <Pressable onPress={() => router.push('/login')}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary, textAlign: 'center' }}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom + spacing[8], justifyContent: 'space-between' }}>
        <View>
          {/* Back */}
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[6] }}>
            <SLIcon name="chevron-left" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>Back</Text>
          </Pressable>

          <Text style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
            Reset Password
          </Text>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 22, marginBottom: spacing[8] }}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          {/* Email */}
          <View style={{ marginBottom: spacing[8] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[2] }}>
              Email
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  style={inputStyle}
                />
              )}
            />
            {errors.email && (
              <Text style={{ color: colors.brand.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Submit */}
          <SLButton label="Send Reset Link" onPress={handleSubmit(onSubmit)} fullWidth size="lg" loading={loading} iconLeft="mail" />
        </View>

        {/* Back to Login */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[2] }}>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Remember your password?</Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
