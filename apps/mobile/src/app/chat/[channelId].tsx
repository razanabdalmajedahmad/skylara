import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useMessages, useSendMessage, ChatMessage } from '@/hooks/useChat';
import { SLIcon } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface ChannelInfo {
  id: string | number;
  name: string;
  type: 'LOAD' | 'DIRECT' | 'GROUP';
  memberCount: number;
}

function formatMessageTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDateSeparator(messages: ChatMessage[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const current = new Date(messages[index].createdAt);
  const next = new Date(messages[index + 1].createdAt);
  return current.toDateString() !== next.toDateString();
}

function shouldShowTimestamp(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index].createdAt);
  const prev = new Date(messages[index - 1].createdAt);
  return current.getTime() - prev.getTime() > 5 * 60 * 1000;
}

function MessageBubble({ message, isOwn, showSenderName, showTimestamp }: {
  message: ChatMessage; isOwn: boolean; showSenderName: boolean; showTimestamp: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[1], alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
      {showTimestamp && (
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center', alignSelf: 'center', marginBottom: spacing[2], marginTop: spacing[2] }}>
          {formatMessageTime(message.createdAt)}
        </Text>
      )}
      {showSenderName && !isOwn && (
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.semibold, marginBottom: spacing[1], marginLeft: spacing[1] }}>
          {message.senderName}
        </Text>
      )}
      <View style={{
        maxWidth: '80%',
        borderRadius: 16,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        backgroundColor: isOwn ? colors.brand.primary : colors.gray[100],
        borderBottomRightRadius: isOwn ? 4 : 16,
        borderBottomLeftRadius: isOwn ? 16 : 4,
      }}>
        <Text style={{ fontSize: typography.fontSize.base, color: isOwn ? colors.text.inverse : colors.text.primary }}>
          {message.body}
        </Text>
      </View>
    </View>
  );
}

export default function ChatThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMessages(
    channelId ? parseInt(String(channelId)) : null
  );
  const { mutate: sendMessage } = useSendMessage();

  const allMessages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.messages).reverse();
  }, [data]);

  const channel: ChannelInfo = { id: channelId ?? 'unknown', name: 'Chat', type: 'DIRECT', memberCount: 2 };
  const isGroupChat = channel.type === 'GROUP' || channel.type === 'LOAD';

  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !channelId) return;
    sendMessage({ channelId: parseInt(String(channelId)), body: trimmed }, {
      onSuccess: () => {
        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      },
    });
  }, [inputText, channelId, sendMessage]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const originalIndex = allMessages.length - 1 - index;
    return (
      <>
        {shouldShowDateSeparator(allMessages, originalIndex) && (
          <View style={{ alignItems: 'center', marginVertical: spacing[3] }}>
            <View style={{ backgroundColor: colors.gray[200], borderRadius: 20, paddingHorizontal: spacing[3], paddingVertical: spacing[1] }}>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.medium }}>
                {formatDateSeparator(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        <MessageBubble message={item} isOwn={isOwn} showSenderName={isGroupChat && !isOwn} showTimestamp={shouldShowTimestamp(allMessages, originalIndex)} />
      </>
    );
  }, [allMessages, isGroupChat, user?.id]);

  if (isLoading && !allMessages.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: spacing[3] }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
            </Pressable>
            <SLSkeleton width={120} height={20} />
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SLIcon name="message-square" size="lg" color={colors.text.tertiary} />
          <Text style={{ color: colors.text.tertiary, marginTop: spacing[3] }}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], paddingTop: insets.top + spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: spacing[3] }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }} numberOfLines={1}>{channel.name}</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {channel.type === 'DIRECT' ? 'Direct message' : `${channel.memberCount} members`}
            </Text>
          </View>
          <Pressable onPress={() => Alert.alert('Coming Soon', 'Channel info and settings will be available soon.')} style={{ padding: spacing[2] }}>
            <SLIcon name="info" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: spacing[2] }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[8], paddingHorizontal: spacing[6] }}>
              <Text style={{ color: colors.text.tertiary, textAlign: 'center' }}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing[4], paddingVertical: spacing[2], paddingBottom: insets.bottom + spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Pressable style={{ padding: spacing[2], marginRight: spacing[1] }}>
              <SLIcon name="image" size="md" color={colors.text.tertiary} />
            </Pressable>
            <View style={{ flex: 1, backgroundColor: colors.gray[100], borderRadius: 20, paddingHorizontal: spacing[4], paddingVertical: spacing[2], maxHeight: 128 }}>
              <TextInput
                style={{ fontSize: typography.fontSize.base, color: colors.text.primary }}
                placeholder="Type a message..."
                placeholderTextColor={colors.text.tertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={inputText.trim().length === 0}
              style={{
                marginLeft: spacing[2],
                width: 36, height: 36, borderRadius: 18,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: inputText.trim().length > 0 ? colors.brand.primary : colors.gray[200],
              }}
            >
              <SLIcon name="send" size="sm" color={inputText.trim().length > 0 ? colors.text.inverse : colors.text.tertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
