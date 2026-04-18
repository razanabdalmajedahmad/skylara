import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  SectionList,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useChannels, useChatUsers } from '@/hooks/useChat';
import { SLIcon, SLAvatar, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import SLButton from '@/components/ui/SLButton';
import { AssistantModal } from '@/components/assistant/AssistantModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelType = 'LOAD' | 'DIRECT' | 'GROUP';

interface LocalChannel {
  id: string | number;
  name: string;
  type: ChannelType;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  memberCount: number;
  muted?: boolean;
}

interface User {
  id: string | number;
  name: string;
  firstName: string;
  lastName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  const days = Math.floor(seconds / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChannelIcon(type: ChannelType): IconName {
  switch (type) {
    case 'LOAD':
      return 'plane';
    case 'GROUP':
      return 'users';
    default:
      return 'message-square';
  }
}

function getAvatarBg(type: ChannelType): string {
  switch (type) {
    case 'LOAD':
      return colors.sky[500];
    case 'DIRECT':
      return colors.status.inFlight;
    case 'GROUP':
      return colors.accent.emerald;
    default:
      return colors.gray[400];
  }
}

// ---------------------------------------------------------------------------
// Channel Row
// ---------------------------------------------------------------------------

function ChannelRow({
  channel,
  onPress,
  onMute,
}: {
  channel: LocalChannel;
  onPress: () => void;
  onMute: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <Pressable
        onPress={() => {
          onMute();
          swipeableRef.current?.close();
        }}
        style={{
          backgroundColor: colors.gray[500],
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
        }}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <SLIcon name={channel.muted ? 'bell' : 'bell-off'} size="sm" color={colors.text.inverse} />
          <Text style={{ color: colors.text.inverse, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, marginTop: 2 }}>
            {channel.muted ? 'Unmute' : 'Mute'}
          </Text>
        </Animated.View>
      </Pressable>
    );
  };

  const innerContent = (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[3.5] || 14,
          backgroundColor: pressed ? colors.gray[50] : colors.surface,
        })}
      >
        {/* Avatar */}
        {channel.type === 'DIRECT' ? (
          <SLAvatar
            firstName={(channel.name || 'Direct').split(' ')[0]}
            lastName={(channel.name || '').split(' ')[1]}
            size="md"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: getAvatarBg(channel.type),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SLIcon name={getChannelIcon(channel.type)} size="md" color={colors.text.inverse} />
          </View>
        )}

        {/* Content */}
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing[2] }}>
              <Text
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: channel.unreadCount > 0 ? typography.fontWeight.bold : typography.fontWeight.semibold,
                  color: channel.unreadCount > 0 ? colors.text.primary : colors.text.secondary,
                }}
                numberOfLines={1}
              >
                {channel.name || 'Direct Message'}
              </Text>
              {channel.muted && (
                <View style={{ marginLeft: 6 }}>
                  <SLIcon name="bell-off" size="xs" color={colors.text.tertiary} />
                </View>
              )}
            </View>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {channel.lastMessageTime}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                flex: 1,
                marginRight: spacing[3],
                color: channel.unreadCount > 0 ? colors.text.secondary : colors.text.tertiary,
              }}
              numberOfLines={1}
            >
              {channel.lastMessage}
            </Text>
            {channel.unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.brand.primary,
                  borderRadius: radii.full,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: colors.text.inverse, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold }}>
                  {channel.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
  );

  if (Platform.OS === 'web') {
    return innerContent;
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      {innerContent}
    </Swipeable>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const router = useRouter();
  const { data: apiChannels, isLoading, refetch } = useChannels();
  const { data: apiUsers = [] } = useChatUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [mutedChannels, setMutedChannels] = useState<Set<string | number>>(new Set());

  // Phase 8 / Phase 16: Assistant consumer — shared modal + client pattern
  const [assistantVisible, setAssistantVisible] = useState(false);

  const channels = useMemo<LocalChannel[]>(() => {
    if (!apiChannels) return [];
    return apiChannels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      lastMessage: ch.lastMessage || '(no messages yet)',
      lastMessageTime: formatTimeAgo(ch.lastMessageTime),
      unreadCount: ch.unreadCount,
      memberCount: ch.memberCount,
      muted: mutedChannels.has(ch.id),
    }));
  }, [apiChannels, mutedChannels]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) || ch.lastMessage.toLowerCase().includes(q),
    );
  }, [channels, searchQuery]);

  const sections = useMemo(() => {
    const loadChannels = filteredChannels.filter((ch) => ch.type === 'LOAD');
    const dmChannels = filteredChannels.filter((ch) => ch.type === 'DIRECT' || ch.type === 'GROUP');

    const result: { title: string; data: LocalChannel[] }[] = [];
    if (loadChannels.length > 0) {
      result.push({ title: 'Load Channels', data: loadChannels });
    }
    if (dmChannels.length > 0) {
      result.push({ title: 'Direct Messages', data: dmChannels });
    }
    return result;
  }, [filteredChannels]);

  const handleMute = useCallback((channelId: string | number) => {
    setMutedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }, []);

  const displayUsers = useMemo<User[]>(() => {
    return apiUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
    }));
  }, [apiUsers]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return displayUsers;
    const q = userSearchQuery.toLowerCase();
    return displayUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [userSearchQuery, displayUsers]);

  const handleStartChat = useCallback(
    (user: User) => {
      setNewChatModalVisible(false);
      setUserSearchQuery('');
      router.push(`/chat/${user.id}`);
    },
    [router],
  );

  const assistantSuggestions = useMemo(
    () => [
      'Summarize today’s ops status (loads, queue, holds).',
      'What should I check before boarding?',
      'Any weather risks in the next hour?',
      'What’s the next best action for manifest staff?',
    ],
    [],
  );

  if (isLoading && !channels.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3] }}>
          <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Messages
          </Text>
        </View>
        <View style={{ padding: spacing[5], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3] }}>
        <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
          Messages
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => setAssistantVisible(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.gray[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Open assistant"
          >
            <SLIcon name="cpu" size="sm" color={colors.brand.primary} />
          </Pressable>
          <Pressable
            onPress={() => setNewChatModalVisible(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="New message"
          >
            <SLIcon name="plus" size="sm" color={colors.text.inverse} />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
        <View
          style={{
            backgroundColor: colors.gray[100],
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[3.5] || 14,
            paddingVertical: spacing[2.5] || 10,
          }}
        >
          <SLIcon name="search" size="sm" color={colors.text.tertiary} />
          <TextInput
            style={{
              flex: 1,
              fontSize: typography.fontSize.base,
              color: colors.text.primary,
              marginLeft: spacing[2],
            }}
            placeholder="Search conversations..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <SLIcon name="x" size="sm" color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Channel List */}
      {sections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[8] }}>
          <SLEmptyState
            icon="message-square"
            title="No conversations found"
            description={searchQuery ? 'Try a different search term' : 'Start a new chat to get going'}
            actionLabel={!searchQuery ? 'New Message' : undefined}
            onAction={!searchQuery ? () => setNewChatModalVisible(true) : undefined}
          />
        </View>
      ) : (
        <SectionList<LocalChannel>
          sections={sections}
          keyExtractor={(item: LocalChannel) => String(item.id)}
          stickySectionHeadersEnabled={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ backgroundColor: colors.gray[50], paddingHorizontal: spacing[5], paddingVertical: spacing[2] }}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, letterSpacing: 0.5 }}>
                {title.toUpperCase()}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ChannelRow
              channel={item}
              onPress={() => router.push(`/chat/${item.id}`)}
              onMute={() => handleMute(item.id)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.gray[100], marginLeft: spacing[20] || 80 }} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[6] }}
        />
      )}

      {/* New Chat Modal */}
      <Modal
        visible={newChatModalVisible}
        onRequestClose={() => {
          setNewChatModalVisible(false);
          setUserSearchQuery('');
        }}
        transparent
        animationType="slide"
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => {
            setNewChatModalVisible(false);
            setUserSearchQuery('');
          }}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[3] }}>
              <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                New Message
              </Text>
              <Pressable
                onPress={() => {
                  setNewChatModalVisible(false);
                  setUserSearchQuery('');
                }}
              >
                <Text style={{ color: colors.brand.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base }}>
                  Cancel
                </Text>
              </Pressable>
            </View>

            {/* User Search */}
            <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
              <View
                style={{
                  backgroundColor: colors.gray[100],
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing[3.5] || 14,
                  paddingVertical: spacing[2.5] || 10,
                }}
              >
                <SLIcon name="search" size="sm" color={colors.text.tertiary} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: typography.fontSize.base,
                    color: colors.text.primary,
                    marginLeft: spacing[2],
                  }}
                  placeholder="Search people..."
                  placeholderTextColor={colors.text.tertiary}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            {/* User List */}
            <FlatList<User>
              data={filteredUsers}
              keyExtractor={(item: User) => String(item.id)}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleStartChat(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing[5],
                    paddingVertical: spacing[3],
                    backgroundColor: pressed ? colors.gray[50] : 'transparent',
                  })}
                >
                  <SLAvatar firstName={item.firstName} lastName={item.lastName} size="sm" />
                  <Text style={{ marginLeft: spacing[3], fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: colors.gray[100], marginLeft: 72 }} />
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
                  <Text style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                    No users found
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />

            <View style={{ height: spacing[8] }} />
          </Pressable>
        </Pressable>
      </Modal>

      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        title="Assistant"
        subtitle="Streaming when supported, JSON fallback"
        context={{ currentRoute: '/mobile/chat', currentPage: 'Mobile Messages' }}
        suggestions={assistantSuggestions}
      />
    </View>
  );
}
