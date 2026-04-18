import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore, AppNotification } from '@/stores/notifications';
import { api } from '@/lib/api';
import { SLIcon, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface SectionData {
  title: string;
  data: AppNotification[];
}

const getNotificationIcon = (type: string): IconName => {
  switch (type) {
    case 'LOAD_READY':
    case 'LOAD_BOARDING':
    case 'LOAD_DEPARTURE':
      return 'plane';
    case 'CALL_30MIN':
    case 'CALL_20MIN':
    case 'CALL_10MIN':
      return 'clock';
    case 'PAYMENT_RECEIVED':
      return 'credit-card';
    case 'WEATHER_WARNING':
      return 'cloud';
    case 'WEATHER_HOLD':
      return 'cloud-rain';
    case 'EMERGENCY_ALERT':
      return 'siren';
    case 'GEAR_CHECK_FAILED':
    case 'REPACK_DUE':
    case 'AAD_EXPIRING':
      return 'wrench';
    default:
      return 'bell';
  }
};

const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'LOAD_READY':
    case 'LOAD_BOARDING':
    case 'LOAD_DEPARTURE':
      return colors.brand.primary;
    case 'CALL_30MIN':
    case 'CALL_20MIN':
    case 'CALL_10MIN':
      return colors.accent.orange;
    case 'PAYMENT_RECEIVED':
      return colors.brand.success;
    case 'WEATHER_WARNING':
    case 'WEATHER_HOLD':
      return colors.brand.secondary;
    case 'EMERGENCY_ALERT':
      return colors.brand.danger;
    case 'GEAR_CHECK_FAILED':
    case 'REPACK_DUE':
    case 'AAD_EXPIRING':
      return colors.brand.warning;
    default:
      return colors.text.tertiary;
  }
};

const getScreenForNotification = (type: string, data?: Record<string, any>): string | null => {
  switch (type) {
    case 'LOAD_READY':
    case 'LOAD_BOARDING':
    case 'LOAD_DEPARTURE':
      return `/manifest/load-detail?loadId=${data?.loadId}`;
    case 'PAYMENT_RECEIVED':
      return '/payments/wallet';
    case 'EMERGENCY_ALERT':
    case 'WEATHER_HOLD':
      return '/manifest/load-board';
    case 'GEAR_CHECK_FAILED':
    case 'REPACK_DUE':
    case 'AAD_EXPIRING':
      return '/logbook';
    default:
      return null;
  }
};

const getDateSection = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayDateOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  if (dateOnly.getTime() === nowDateOnly.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterdayDateOnly.getTime()) return 'Yesterday';
  return 'Earlier';
};

const formatTimeAgo = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        await fetchNotifications();
      } finally {
        setIsLoading(false);
      }
    };
    loadNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get('/jumpers/me/notifications');
      const unread = data.filter((n: AppNotification) => n.status !== 'READ').length;
      useNotificationStore.setState({
        notifications: data,
        unreadCount: unread,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleNotificationPress = async (notification: AppNotification) => {
    if (notification.status !== 'READ') {
      await markAsRead(notification.id);
    }
    const screen = getScreenForNotification(notification.type, notification.data);
    if (screen) {
      router.push(screen);
    }
  };

  const sections: SectionData[] = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    notifications.forEach((notif) => {
      const section = getDateSection(notif.createdAt);
      groups[section].push(notif);
    });
    return [
      { title: 'Today', data: groups.Today },
      { title: 'Yesterday', data: groups.Yesterday },
      { title: 'Earlier', data: groups.Earlier },
    ].filter((section) => section.data.length > 0);
  }, [notifications]);

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const isUnread = item.status !== 'READ';
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    const timeAgo = formatTimeAgo(item.createdAt);

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => ({
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[100],
          flexDirection: 'row',
          gap: spacing[3],
          backgroundColor: isUnread ? colors.sky[50] : pressed ? colors.gray[50] : colors.surface,
        })}
      >
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: iconColor + '15',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SLIcon name={iconName} size="md" color={iconColor} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] }}>
            <Text style={{ flex: 1, marginRight: spacing[2], fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              {item.title}
            </Text>
            {isUnread && (
              <View style={{ width: 8, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
            )}
          </View>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, lineHeight: 16, marginBottom: spacing[2] }}>
            {item.body}
          </Text>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
            {timeAgo}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: SectionData }) => (
    <View style={{ backgroundColor: colors.gray[50], paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, letterSpacing: 1 }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );

  const headerComponent = unreadCount > 0 ? (
    <View
      style={{
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>
            {unreadCount}
          </Text>
        </View>
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
          unread
        </Text>
      </View>
      <Pressable
        onPress={() => markAllAsRead()}
        style={({ pressed }) => ({
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: 8,
          backgroundColor: pressed ? colors.gray[100] : 'transparent',
        })}
      >
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
          Mark All Read
        </Text>
      </Pressable>
    </View>
  ) : null;

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
            Notifications
          </Text>
          <Pressable onPress={onRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="bell"
            title="No Notifications"
            description="You're all caught up! Notifications will appear here when you have new updates."
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={headerComponent}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
        />
      )}
    </View>
  );
}
