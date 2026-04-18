import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import Constants from 'expo-constants';
import { SLIcon } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Portuguese', value: 'pt' },
];

const THEME_OPTIONS = [
  { label: 'Light', value: 'light', icon: 'sun' as IconName },
  { label: 'Dark', value: 'dark', icon: 'moon' as IconName },
  { label: 'System', value: 'system', icon: 'smartphone' as IconName },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();

  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('system');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirm Deletion',
              'Are you absolutely sure? Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    Alert.alert('Account Deleted', 'Your account has been permanently deleted');
                    await logout();
                    router.replace('/login');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const legalLinks: { icon: IconName; label: string }[] = [
    { icon: 'shield', label: 'Privacy Policy' },
    { icon: 'file-text', label: 'Terms of Service' },
    { icon: 'alert-triangle', label: 'Safety Guidelines' },
  ];

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
            Settings
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="bell" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Notifications
            </Text>
          </View>

          <View style={{ gap: spacing[3] }}>
            {/* Push Notifications */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="smartphone" size="sm" color={colors.text.secondary} />
                <View>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Push Notifications
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    Jump alerts & updates
                  </Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: colors.gray[200], true: colors.sky[300] }}
                thumbColor={pushNotifications ? colors.brand.primary : colors.gray[100]}
              />
            </View>

            {/* Email Notifications */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="mail" size="sm" color={colors.text.secondary} />
                <View>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Email Notifications
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    Weekly reports & news
                  </Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: colors.gray[200], true: colors.sky[300] }}
                thumbColor={emailNotifications ? colors.brand.primary : colors.gray[100]}
              />
            </View>

            {/* SMS Notifications */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="message-square" size="sm" color={colors.text.secondary} />
                <View>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    SMS Notifications
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    Urgent alerts only
                  </Text>
                </View>
              </View>
              <Switch
                value={smsNotifications}
                onValueChange={setSmsNotifications}
                trackColor={{ false: colors.gray[200], true: colors.sky[300] }}
                thumbColor={smsNotifications ? colors.brand.primary : colors.gray[100]}
              />
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="sliders" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Preferences
            </Text>
          </View>

          <View style={{ gap: spacing[3] }}>
            {/* Units */}
            <View
              style={{
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
              }}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>
                Units
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                <Pressable
                  onPress={() => setUnits('metric')}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    paddingVertical: spacing[2],
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: units === 'metric' ? colors.brand.primary : colors.border,
                    backgroundColor: units === 'metric' ? colors.sky[50] : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: units === 'metric' ? typography.fontWeight.semibold : typography.fontWeight.medium,
                      color: units === 'metric' ? colors.brand.primary : colors.text.secondary,
                    }}
                  >
                    Metric (kg/km)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setUnits('imperial')}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    paddingVertical: spacing[2],
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: units === 'imperial' ? colors.brand.primary : colors.border,
                    backgroundColor: units === 'imperial' ? colors.sky[50] : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: units === 'imperial' ? typography.fontWeight.semibold : typography.fontWeight.medium,
                      color: units === 'imperial' ? colors.brand.primary : colors.text.secondary,
                    }}
                  >
                    Imperial (lbs/mi)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Language */}
            <View>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
                Language
              </Text>
              <Pressable
                onPress={() => setShowLanguagePicker(true)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <SLIcon name="globe" size="sm" color={colors.text.secondary} />
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {LANGUAGE_OPTIONS.find((l) => l.value === language)?.label}
                  </Text>
                </View>
                <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
              </Pressable>
            </View>

            {/* Theme */}
            <View>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[2] }}>
                Theme
              </Text>
              <Pressable
                onPress={() => setShowThemePicker(true)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <SLIcon name={THEME_OPTIONS.find((t) => t.value === theme)?.icon || 'sun'} size="sm" color={colors.text.secondary} />
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {THEME_OPTIONS.find((t) => t.value === theme)?.label}
                  </Text>
                </View>
                <SLIcon name="chevron-down" size="sm" color={colors.text.tertiary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* App Information */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="info" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              App Information
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.gray[50],
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              App Version
            </Text>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              {appVersion}
            </Text>
          </View>
        </View>

        {/* Legal Section */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="file-text" size="md" color={colors.brand.primary} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Legal
            </Text>
          </View>

          <View style={{ gap: spacing[2] }}>
            {legalLinks.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => Alert.alert('Coming Soon', `${link.label} will be available soon.`)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <SLIcon name={link.icon} size="sm" color={colors.text.secondary} />
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {link.label}
                  </Text>
                </View>
                <SLIcon name="chevron-right" size="sm" color={colors.text.tertiary} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
            <SLIcon name="alert-triangle" size="md" color={colors.brand.danger} />
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.brand.danger }}>
              Danger Zone
            </Text>
          </View>

          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.tint.danger.border : colors.tint.danger.bg,
              borderWidth: 1,
              borderColor: colors.tint.danger.border,
              borderRadius: 8,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[4],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
            })}
          >
            <SLIcon name="trash" size="md" color={colors.brand.danger} />
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.brand.danger }}>
              Delete Account
            </Text>
          </Pressable>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowLanguagePicker(false)}
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
              <SLIcon name="globe" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Select Language
              </Text>
            </View>
            <FlatList
              data={LANGUAGE_OPTIONS}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setLanguage(item.value);
                    setShowLanguagePicker(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderTopWidth: 1,
                    borderTopColor: colors.gray[100],
                    backgroundColor: language === item.value ? colors.sky[50] : pressed ? colors.gray[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  })}
                >
                  <Text
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: language === item.value ? typography.fontWeight.semibold : typography.fontWeight.medium,
                      color: language === item.value ? colors.brand.primary : colors.text.primary,
                    }}
                  >
                    {item.label}
                  </Text>
                  {language === item.value && (
                    <SLIcon name="check" size="sm" color={colors.brand.primary} />
                  )}
                </Pressable>
              )}
              keyExtractor={(item) => item.value}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowThemePicker(false)}
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
              <SLIcon name="sun" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Select Theme
              </Text>
            </View>
            <FlatList
              data={THEME_OPTIONS}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setTheme(item.value);
                    setShowThemePicker(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderTopWidth: 1,
                    borderTopColor: colors.gray[100],
                    backgroundColor: theme === item.value ? colors.sky[50] : pressed ? colors.gray[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <SLIcon name={item.icon} size="sm" color={theme === item.value ? colors.brand.primary : colors.text.secondary} />
                    <Text
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: theme === item.value ? typography.fontWeight.semibold : typography.fontWeight.medium,
                        color: theme === item.value ? colors.brand.primary : colors.text.primary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {theme === item.value && (
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
