import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useGoogleAuth, exchangeOAuthCode, signInWithApple } from '@/lib/oauth';
import { SLIcon, SLButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterFormData = z.infer<typeof registerSchema>;

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#F97316' };
  if (score <= 3) return { score, label: 'Good', color: '#EAB308' };
  if (score <= 4) return { score, label: 'Strong', color: '#22C55E' };
  return { score, label: 'Very Strong', color: '#16A34A' };
}

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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const { promptAsync: promptGoogleAsync, response: googleResponse } = useGoogleAuth();

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type === 'success' && googleResponse.params?.code) {
        setLoading(true);
        try {
          const redirectUri = googleResponse.params.redirect_uri || '';
          await exchangeOAuthCode('google', googleResponse.params.code, redirectUri);
          router.replace('/onboarding/welcome');
        } catch (error: any) {
          Alert.alert('Google Sign Up Failed', error.message || 'Please try again');
        } finally { setLoading(false); }
      }
    };
    handleGoogleResponse();
  }, [googleResponse, router]);

  const handleGoogleSignUp = async () => {
    try { await promptGoogleAsync(); } catch (error: any) {
      Alert.alert('Google Sign Up Error', error.message || 'Please try again');
    }
  };

  const handleAppleSignUp = async () => {
    setLoading(true);
    try { await signInWithApple(); router.replace('/onboarding/welcome'); } catch (error: any) {
      Alert.alert('Apple Sign Up Failed', error.message || 'Please try again');
    } finally { setLoading(false); }
  };

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const passwordStrength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await register({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName, phone: data.phone });
      router.replace('/onboarding/welcome');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally { setLoading(false); }
  };

  const renderField = (name: keyof RegisterFormData, label: string, props: any = {}) => (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[2] }}>
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholderTextColor={colors.text.tertiary}
            editable={!loading}
            style={inputStyle}
            {...props}
          />
        )}
      />
      {errors[name] && (
        <Text style={{ color: colors.brand.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
          {errors[name]?.message}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6], justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[8] }}>
            Create Account
          </Text>

          {renderField('firstName', 'First Name', { placeholder: 'John' })}
          {renderField('lastName', 'Last Name', { placeholder: 'Doe' })}
          {renderField('email', 'Email', { placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
          {renderField('phone', 'Phone (Optional)', { placeholder: '+971 50 123 4567', keyboardType: 'phone-pad' })}

          {/* Password */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[2] }}>
              Password
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray[50], borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={(text) => { onChange(text); setPasswordValue(text); }}
                    placeholder="........"
                    placeholderTextColor={colors.text.tertiary}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    style={{ flex: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: typography.fontSize.base, color: colors.text.primary }}
                  />
                )}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
                <SLIcon name={showPassword ? 'eye-off' : 'eye'} size="sm" color={colors.brand.primary} />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={{ color: colors.brand.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
                {errors.password.message}
              </Text>
            )}
            {/* Strength */}
            {passwordValue ? (
              <View style={{ marginTop: spacing[2] }}>
                <View style={{ flexDirection: 'row', gap: 4, height: 8, marginBottom: spacing[1] }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={{ flex: 1, borderRadius: 4, backgroundColor: i < passwordStrength.score ? passwordStrength.color : colors.gray[200] }} />
                  ))}
                </View>
                <Text style={{ color: passwordStrength.color, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
                  {passwordStrength.label}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[2] }}>
              Confirm Password
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray[50], borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="........"
                    placeholderTextColor={colors.text.tertiary}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    style={{ flex: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: typography.fontSize.base, color: colors.text.primary }}
                  />
                )}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
                <SLIcon name={showConfirmPassword ? 'eye-off' : 'eye'} size="sm" color={colors.brand.primary} />
              </Pressable>
            </View>
            {errors.confirmPassword && (
              <Text style={{ color: colors.brand.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

          {/* Submit */}
          <View style={{ marginBottom: spacing[6] }}>
            <SLButton label="Create Account" onPress={handleSubmit(onSubmit)} fullWidth size="lg" loading={loading} iconLeft="user-plus" />
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[6] }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ paddingHorizontal: spacing[3], fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>or sign up with</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* OAuth */}
          <View style={{ flexDirection: 'row', gap: spacing[4], marginBottom: spacing[8] }}>
            <View style={{ flex: 1 }}>
              <SLButton label="Google" onPress={handleGoogleSignUp} variant="outline" fullWidth disabled={loading} iconLeft="globe" />
            </View>
            {Platform.OS === 'ios' && (
              <View style={{ flex: 1 }}>
                <SLButton label="Apple" onPress={handleAppleSignUp} variant="outline" fullWidth disabled={loading} iconLeft="smartphone" />
              </View>
            )}
          </View>
        </View>

        {/* Sign In Link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[2] }}>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Already have an account?</Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
