import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SLButton, SLIcon } from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';
import { useAssistantConversation } from '@/hooks/useAssistantConversation';

export function AssistantModal({
  visible,
  onClose,
  title,
  subtitle,
  context,
  suggestions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  context: { currentRoute: string; currentPage: string };
  suggestions?: string[];
}) {
  const { input, setInput, turns, loading, streamBuffer, error, send, stop } = useAssistantConversation({
    context,
    active: visible,
  });

  const defaultSuggestions = useMemo(
    () =>
      suggestions?.filter(Boolean).slice(0, 4) ?? [
        'What should I know before booking here?',
        'What is the best first jump option for a beginner?',
        'What documents or waivers will I need?',
        'What weather limits should I watch for?',
      ],
    [suggestions],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: spacing[4],
            paddingHorizontal: spacing[6],
            paddingBottom: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="x" size="lg" color={colors.text.primary} />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {loading ? (
              <SLButton label="Stop" onPress={stop} size="sm" variant="outline" iconLeft="x" />
            ) : (
              <View style={{ width: 64 }} />
            )}
          </View>
        </View>

        {error ? (
          <View style={{ padding: spacing[6] }}>
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: radii.lg,
                padding: spacing[4],
                borderWidth: 1,
                borderColor: '#FCA5A5',
              }}
            >
              <Text style={{ color: '#991B1B', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Body */}
        <View style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[4] }}>
          {turns.length === 0 ? (
            <View style={{ gap: spacing[3] }}>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Ask a question, or tap a quick suggestion:
              </Text>
              {defaultSuggestions.map((s) => (
                <Pressable
                  key={s}
                  disabled={loading}
                  onPress={() => void send(s)}
                  style={{
                    padding: spacing[4],
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <FlatList
              data={turns}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ paddingBottom: spacing[4] }}
              renderItem={({ item }) => {
                const isUser = item.role === 'user';
                return (
                  <View style={{ marginBottom: spacing[3], alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <View
                      style={{
                        maxWidth: '92%',
                        paddingHorizontal: spacing[4],
                        paddingVertical: spacing[3],
                        borderRadius: radii.xl,
                        backgroundColor: isUser ? colors.brand.primary : colors.surface,
                        borderWidth: isUser ? 0 : 1,
                        borderColor: isUser ? 'transparent' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: isUser ? colors.text.inverse : colors.text.primary,
                          lineHeight: typography.lineHeight.sm,
                        }}
                      >
                        {item.text}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                loading ? (
                  <View style={{ marginBottom: spacing[3], alignItems: 'flex-start' }}>
                    <View
                      style={{
                        maxWidth: '92%',
                        paddingHorizontal: spacing[4],
                        paddingVertical: spacing[3],
                        borderRadius: radii.xl,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>
                        {streamBuffer || 'Thinking…'}
                        {streamBuffer ? <Text style={{ color: colors.brand.primary }}>▍</Text> : null}
                      </Text>
                    </View>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* Composer */}
        <View
          style={{
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[4],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] }}>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.lg,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask something…"
                placeholderTextColor={colors.text.tertiary}
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.primary,
                  minHeight: 36,
                }}
                editable={!loading}
                multiline
              />
            </View>
            <SLButton
              label="Send"
              onPress={() => void send()}
              disabled={!input.trim() || loading}
              iconLeft="send"
              size="md"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

