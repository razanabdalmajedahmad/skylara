import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { SLIcon, SLButton, SLAvatar } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setWeight(user.profile?.weight?.toString() || '');
      setDateOfBirth(user.profile?.dateOfBirth || '');
      setNationality(user.profile?.nationality || '');
      setBio(user.profile?.bio || '');
      setEmergencyContactName(user.emergencyContactName || '');
      setEmergencyContactPhone(user.emergencyContactPhone || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        profile: {
          weight: weight ? parseInt(weight, 10) : undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
          nationality: nationality.trim() || undefined,
          bio: bio.trim() || undefined,
        },
      };

      await api.patch('/jumpers/me', payload);
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6] }}>
        <SLSkeleton width={200} height={24} />
        <View style={{ marginTop: spacing[6], gap: spacing[4] }}>
          <SLSkeleton width="100%" height={48} />
          <SLSkeleton width="100%" height={48} />
          <SLSkeleton width="100%" height={48} />
        </View>
      </View>
    );
  }

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
            Edit Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[8], borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}>
          <View style={{ alignItems: 'center' }}>
            <SLAvatar
              firstName={firstName}
              lastName={lastName}
              size="xl"
            />
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Avatar upload will be available soon via S3.')}
              style={{
                marginTop: spacing[4],
                backgroundColor: colors.sky[50],
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <SLIcon name="camera" size="sm" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
                Change Avatar
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Personal Information */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="user" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Personal Information
            </Text>
          </View>

          {/* First Name */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>First Name</Text>
            <TextInput
              style={inputStyle}
              placeholder="Enter first name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Last Name */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Last Name</Text>
            <TextInput
              style={inputStyle}
              placeholder="Enter last name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Phone */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Phone Number</Text>
            <TextInput
              style={inputStyle}
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Date of Birth */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Date of Birth</Text>
            <TextInput
              style={inputStyle}
              placeholder="YYYY-MM-DD"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Weight */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Weight (kg)</Text>
            <TextInput
              style={inputStyle}
              placeholder="80"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Nationality */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={labelStyle}>Nationality</Text>
            <TextInput
              style={inputStyle}
              placeholder="United States"
              value={nationality}
              onChangeText={setNationality}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={{ paddingHorizontal: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="phone" size="md" color="#EF4444" />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Emergency Contact
            </Text>
          </View>

          <View style={{ marginBottom: spacing[4] }}>
            <Text style={labelStyle}>Contact Name</Text>
            <TextInput
              style={inputStyle}
              placeholder="Full name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={{ marginBottom: spacing[6] }}>
            <Text style={labelStyle}>Contact Phone</Text>
            <TextInput
              style={inputStyle}
              placeholder="+1 (555) 000-0000"
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Bio */}
        <View style={{ paddingHorizontal: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="edit" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Bio
            </Text>
          </View>

          <TextInput
            style={{
              ...inputStyle,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            placeholder="Tell us about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8], gap: spacing[3] }}>
          <SLButton
            label="Save Changes"
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
    </View>
  );
}
