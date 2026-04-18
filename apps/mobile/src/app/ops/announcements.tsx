import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLHeader, SLButton, SLIcon, SLInput } from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';

type Audience = 'ALL_CHECKED_IN' | 'ALL_MANIFESTED' | 'ALL_STAFF' | 'CUSTOM';
type Channel = 'PUSH' | 'SMS' | 'BOTH';

const audiences: { label: string; value: Audience }[] = [
  { label: 'All Checked-in', value: 'ALL_CHECKED_IN' },
  { label: 'All Manifested', value: 'ALL_MANIFESTED' },
  { label: 'All Staff', value: 'ALL_STAFF' },
  { label: 'Custom', value: 'CUSTOM' },
];

const channels: { label: string; value: Channel }[] = [
  { label: 'Push', value: 'PUSH' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Both', value: 'BOTH' },
];

export default function AnnouncementsScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('ALL_CHECKED_IN');
  const [channel, setChannel] = useState<Channel>('PUSH');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/send', { title, body, audience, channel });
    },
    onSuccess: () => setSent(true),
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send announcement');
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <SLHeader title="Announcement" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] }}>
          <SLIcon name="check-circle" size="xl" color="#15803D" />
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[4] }}>
            Announcement Sent
          </Text>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: spacing[2] }}>
            Your announcement has been delivered to {audiences.find((a) => a.value === audience)?.label} via {channels.find((c) => c.value === channel)?.label}.
          </Text>
          <View style={{ marginTop: spacing[6] }}>
            <SLButton label="Send Another" onPress={() => { setTitle(''); setBody(''); setSent(false); }} variant="outline" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Send Announcement" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[8] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SLInput
            label="Title"
            placeholder="Announcement title"
            value={title}
            onChangeText={setTitle}
            iconLeft="edit"
          />

          <View style={{ marginTop: spacing[4], gap: spacing[1] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>
              Message
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write your announcement..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing[3],
                minHeight: 120,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
                backgroundColor: colors.background,
              }}
            />
          </View>

          {/* Audience Selector */}
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary, marginTop: spacing[5], marginBottom: spacing[2] }}>
            Audience
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {audiences.map((a) => (
              <Pressable
                key={a.value}
                onPress={() => setAudience(a.value)}
                style={{
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[2],
                  borderRadius: radii.full,
                  backgroundColor: audience === a.value ? colors.brand.primary : colors.gray[100],
                }}
              >
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: audience === a.value ? colors.text.inverse : colors.text.secondary }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Channel Toggle */}
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary, marginTop: spacing[5], marginBottom: spacing[2] }}>
            Channel
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {channels.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setChannel(c.value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing[3],
                  borderRadius: radii.lg,
                  backgroundColor: channel === c.value ? colors.brand.primary : colors.gray[100],
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: channel === c.value ? colors.text.inverse : colors.text.secondary }}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Send Button */}
          <View style={{ marginTop: spacing[6] }}>
            <SLButton
              label="Send Announcement"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!canSend}
              fullWidth
              iconLeft="send"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
