import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, FlatList, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoads } from '@/hooks/useLoads';
import { useDropzoneStore } from '@/stores/dropzone';
import { useRealtimeLoads } from '@/hooks/useRealtimeLoads';
import LoadCard from '@/components/LoadCard';
import { subscribeToChannel } from '@/lib/socket';
import { SLIcon, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography, radii } from '@/theme';

type LoadStatus = 'FILLING' | 'BOARDING' | 'LOCKED' | 'IN_FLIGHT' | 'COMPLETED';

export default function LoadBoardScreen() {
  const insets = useSafeAreaInsets();
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  const [selectedFilter, setSelectedFilter] = useState<'all' | LoadStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: loads = [], isLoading, refetch } = useLoads({
    status: selectedFilter === 'all' ? undefined : selectedFilter,
  });

  useRealtimeLoads();

  useEffect(() => {
    if (dzId) {
      subscribeToChannel(`dz:${dzId}:loads`);
    }
  }, [dzId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadPress = (loadId: string) => {
    router.push(`/manifest/load-detail?loadId=${loadId}`);
  };

  const filters: { label: string; value: 'all' | LoadStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'FILLING' },
    { label: 'Boarding', value: 'BOARDING' },
    { label: 'Locked', value: 'LOCKED' },
  ];

  const filteredLoads = selectedFilter === 'all'
    ? loads
    : loads.filter((load) => load.status === selectedFilter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Load Board
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {filters.map(({ label, value }) => {
            const isActive = selectedFilter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSelectedFilter(value)}
                style={{
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[2],
                  borderRadius: radii.full,
                  backgroundColor: isActive ? colors.brand.primary : colors.gray[100],
                }}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: isActive ? colors.text.inverse : colors.text.secondary,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading && !filteredLoads.length ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : filteredLoads.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="plane"
            title="No active loads right now"
            description="Check back soon or select a different filter"
          />
        </View>
      ) : (
        <FlatList
          data={filteredLoads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleLoadPress(item.id)}
              style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
            >
              <LoadCard load={item} />
            </Pressable>
          )}
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
