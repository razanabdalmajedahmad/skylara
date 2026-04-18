import React, { useState, useEffect, useCallback } from 'react';
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
import { api } from '@/lib/api';
import { isBiometricAvailable, isBiometricEnabled, authenticateWithBiometric, getBiometricType } from '@/lib/biometric';
import { SLIcon, SLButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  const { promptAsync: promptGoogleAsync, response: googleResponse } = useGoogleAuth();

  const navigateAfterAuth = useCallback(async () => {
    try {
      const res = await api.get('/onboarding/status');
      if (res.data?.session && !res.data.session.completedAt) {
        router.replace('/onboarding/steps');
        return;
      }
    } catch { /* no active session */ }
    router.replace('/(tabs)/home');
  }, [router]);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
        const type = await getBiometricType();
        setBiometricType(type);
      }
    };
    checkBiometric();
  }, []);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type === 'success' && googleResponse.params?.code) {
        setLoading(true);
        try {
          const redirectUri = googleResponse.params.redirect_uri || '';
          await exchangeOAuthCode('google', googleResponse.params.code, redirectUri);
          await navigateAfterAuth();
        } catch (error: any) {
          Alert.alert('Google Sign In Failed', error.message || 'Please try again');
        } finally {
          setLoading(false);
        }
      }
    };
    handleGoogleResponse();
  }, [googleResponse, navigateAfterAuth]);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      await navigateAfterAuth();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        Alert.alert('Success', 'Biometric authentication successful. Log in with your credentials to continue.');
      }
    } catch (error: any) {
      Alert.alert('Biometric Auth Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try { await promptGoogleAsync(); } catch (error: any) {
      Alert.alert('Google Sign In Error', error.message || 'Please try again');
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
      await navigateAfterAuth();
    } catch (error: any) {
      Alert.alert('Apple Sign In Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom + spacing[8], justifyContent: 'space-between' }}>
        {/* Biometric */}
        {biometricAvailable && biometricEnabled && (
          <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
            <Pressable
              onPress={handleBiometricAuth}
              disabled={loading}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.sky[50], alignItems: 'center', justifyContent: 'center' }}
            >
              <SLIcon name={biometricType === 'Face ID' ? 'scan' : 'fingerprint'} size="lg" color={colors.brand.primary} />
            </Pressable>
          </View>
        )}

        <View>
          {/* Branding */}
          <View style={{ marginBottom: spacing[10] }}>
            <Text style={{ fontSize: 36, fontWeight: typography.fontWeight.bold, color: colors.brand.primary, marginBottom: spacing[2] }}>
              SkyLara
            </Text>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Skydiving. Simplified.
            </Text>
          </View>

          {/* Email */}
          <View style={{ marginBottom: spacing[6] }}>
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

          {/* Password */}
          <View style={{ marginBottom: spacing[2] }}>
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
                    onChangeText={onChange}
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
          </View>

          {/* Forgot Password */}
          <View style={{ marginBottom: spacing[8], alignItems: 'flex-end' }}>
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.brand.primary }}>
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {/* Sign In */}
          <View style={{ marginBottom: spacing[6] }}>
            <SLButton label="Sign In" onPress={handleSubmit(onSubmit)} fullWidth size="lg" loading={loading} iconLeft="log-in" />
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[6] }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ paddingHorizontal: spacing[3], fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* OAuth */}
          <View style={{ flexDirection: 'row', gap: spacing[4], marginBottom: spacing[8] }}>
            <View style={{ flex: 1 }}>
              <SLButton label="Google" onPress={handleGoogleSignIn} variant="outline" fullWidth disabled={loading} iconLeft="globe" />
            </View>
            {Platform.OS === 'ios' && (
              <View style={{ flex: 1 }}>
                <SLButton label="Apple" onPress={handleAppleSignIn} variant="outline" fullWidth disabled={loading} iconLeft="smartphone" />
              </View>
            )}
          </View>
        </View>

        {/* Sign Up */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[2] }}>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Don't have an account?</Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
              Sign Up
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
