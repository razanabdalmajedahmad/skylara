import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLCard, SLIcon, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useDiscoverDz, type DiscoverDropzone } from '@/hooks/useDiscoverDz';
import { useDropzoneStore } from '@/stores/dropzone';
import { AssistantModal } from '@/components/assistant/AssistantModal';

const ACTIVITY_FILTERS: { key: string; label: string; icon: IconName }[] = [
  { key: 'ALL', label: 'All', icon: 'globe' },
  { key: 'TANDEM', label: 'Tandem', icon: 'users' },
  { key: 'AFF', label: 'AFF', icon: 'graduation-cap' },
  { key: 'FUN_JUMP', label: 'Fun Jump', icon: 'zap' },
  { key: 'WINGSUIT', label: 'Wingsuit', icon: 'wind' },
];

function getStatusColor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
    case 'OPEN':
      return 'success';
    case 'WEATHER_HOLD':
      return 'warning';
    case 'CLOSED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setActiveDz = useDropzoneStore((s) => s.setActiveDz);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);

  const { data: dropzones, isLoading, refetch } = useDiscoverDz({
    query: searchQuery.length >= 2 ? searchQuery : undefined,
    activityType: activeFilter !== 'ALL' ? activeFilter : undefined,
  });

  const filteredDzs = useMemo(() => {
    if (!dropzones) return [];
    // Client-side search for short queries (< 2 chars won't trigger server search)
    if (searchQuery.length > 0 && searchQuery.length < 2) {
      const q = searchQuery.toLowerCase();
      return dropzones.filter(
        (dz) =>
          dz.name.toLowerCase().includes(q) ||
          dz.organization?.name?.toLowerCase().includes(q)
      );
    }
    return dropzones;
  }, [dropzones, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const assistantSuggestions = useMemo(
    () => [
      'How do I shortlist dropzones for a boogie, camp, or multi-day jumping trip?',
      'What skill level or experience is usually expected at busy event-style weekends?',
      'What weather, travel, and logistics should I plan before committing to a trip?',
      'What should I pack for a camp-style or event-heavy weekend at a new DZ?',
      'How do registration, manifests, and first-time visitor booking usually work?',
    ],
    [],
  );

  const handleSelectDz = (dz: DiscoverDropzone) => {
    router.push(`/discover/${dz.id}`);
  };

  const handleSetHomeDz = (dz: DiscoverDropzone) => {
    setActiveDz({
      id: dz.id,
      uuid: dz.uuid,
      name: dz.name,
      slug: dz.slug,
      icaoCode: dz.icaoCode,
      latitude: dz.latitude,
      longitude: dz.longitude,
      timezone: dz.timezone,
      currency: dz.currency,
      windLimitKnots: dz.windLimitKnots,
      status: dz.status,
      organization: dz.organization,
    });
    router.back();
  };

  const renderDzCard = ({ item: dz }: { item: DiscoverDropzone }) => (
    <Pressable onPress={() => handleSelectDz(dz)}>
      <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] }}>
          <View style={{ flex: 1, marginRight: spacing[3] }}>
            <Text
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}
              numberOfLines={1}
            >
              {dz.name}
            </Text>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {dz.organization?.name}
            </Text>
          </View>
          <SLBadge
            label={dz.status === 'ACTIVE' ? 'Open' : dz.status}
            variant={getStatusColor(dz.status)}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing[4], marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <SLIcon name="map-pin" size="xs" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
              {dz.city || dz.country || `${dz.latitude.toFixed(2)}, ${dz.longitude.toFixed(2)}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <SLIcon name="wind" size="xs" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
              Max {dz.windLimitKnots}kt
            </Text>
          </View>
          {dz.icaoCode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <SLIcon name="plane" size="xs" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                {dz.icaoCode}
              </Text>
            </View>
          )}
        </View>

        {/* Activity type pills */}
        {dz.activityTypes && dz.activityTypes.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
            {dz.activityTypes.slice(0, 4).map((activity) => (
              <SLBadge key={activity} label={activity} variant="info" size="sm" />
            ))}
            {dz.activityTypes.length > 4 && (
              <SLBadge label={`+${dz.activityTypes.length - 4}`} variant="neutral" size="sm" />
            )}
          </View>
        )}

        {/* Quick action */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing[2] }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleSetHomeDz(dz);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
          >
            <SLIcon name="check" size="xs" color={colors.brand.primary} />
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.brand.primary,
              }}
            >
              Set as Home DZ
            </Text>
          </Pressable>
        </View>
      </SLCard>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
          backgroundColor: colors.sky[900],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.inverse} />
          </Pressable>
          <Text
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.inverse,
            }}
          >
            Discover Dropzones
          </Text>
          <Pressable
            onPress={() => setAssistantVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Open assistant"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SLIcon name="cpu" size="sm" color={colors.text.inverse} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: radii.lg,
            paddingHorizontal: spacing[3],
            height: 44,
            gap: spacing[2],
          }}
        >
          <SLIcon name="search" size="sm" color="rgba(255,255,255,0.7)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, location..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={{
              flex: 1,
              fontSize: typography.fontSize.base,
              color: colors.text.inverse,
              height: '100%',
              padding: 0,
            }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <SLIcon name="x" size="sm" color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Activity Filters */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <FlatList
          data={ACTIVITY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: spacing[2] }}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            return (
              <Pressable
                onPress={() => setActiveFilter(item.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  borderRadius: radii.full,
                  backgroundColor: isActive ? colors.brand.primary : colors.gray[100],
                  gap: spacing[1],
                }}
              >
                <SLIcon
                  name={item.icon}
                  size="xs"
                  color={isActive ? colors.text.inverse : colors.text.secondary}
                />
                <Text
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: isActive ? colors.text.inverse : colors.text.secondary,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Results */}
      {isLoading && !refreshing ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : filteredDzs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="map-pin"
            title={searchQuery ? 'No Results Found' : 'No Dropzones'}
            description={
              searchQuery
                ? `No dropzones match "${searchQuery}". Try a different search.`
                : 'No dropzones available. Check back later.'
            }
            actionLabel={searchQuery ? 'Clear Search' : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={filteredDzs}
          renderItem={renderDzCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
          }
          ListHeaderComponent={
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                marginBottom: spacing[3],
              }}
            >
              {filteredDzs.length} dropzone{filteredDzs.length !== 1 ? 's' : ''} found
            </Text>
          }
        />
      )}

      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        title="Events & trips"
        subtitle="Boogies, camps, and discovery"
        context={{ currentRoute: '/mobile/discover', currentPage: 'Discover Dropzones' }}
        suggestions={assistantSuggestions}
      />
    </View>
  );
}
