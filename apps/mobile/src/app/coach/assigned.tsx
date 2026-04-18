import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SLCard,
  SLIcon,
  SLEmptyState,
  SLAvatar,
  SLBadge,
} from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

interface AssignedJumper {
  id: string;
  firstName: string;
  lastName: string;
  level: string;
  totalJumps: number;
  nextSessionDate?: string;
  avatarUrl?: string;
}

export default function AssignedJumpers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: jumpers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['coach-assignments'],
    queryFn: async () => {
      const res = await api.get('/training/instructors/me/assignments');
      return res.data as AssignedJumper[];
    },
    staleTime: 60000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderJumper = ({ item }: { item: AssignedJumper }) => (
    <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[2] }}>
      <SLCard padding="md" shadow="sm">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <SLAvatar
            firstName={item.firstName}
            lastName={item.lastName}
            uri={item.avatarUrl}
            size="md"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
              <SLBadge label={item.level} variant="info" />
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                {item.totalJumps} jumps
              </Text>
            </View>
            {item.nextSessionDate && (
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }}>
                Next: {new Date(item.nextSessionDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
          <SLIcon name="chevron-right" size="md" color={colors.text.tertiary} />
        </View>
      </SLCard>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
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
            Assigned Jumpers
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="alert-triangle"
            title="Failed to load assignments"
            description="Pull down to retry"
          />
        </View>
      ) : jumpers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="users"
            title="No assigned jumpers"
            description="Jumpers will appear here when assigned to you"
          />
        </View>
      ) : (
        <FlatList
          data={jumpers}
          keyExtractor={(item) => item.id}
          renderItem={renderJumper}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          contentContainerStyle={{ paddingVertical: spacing[2] }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
