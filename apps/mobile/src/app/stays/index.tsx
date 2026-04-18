import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface Rental {
  id: string;
  title: string;
  type: 'ROOM' | 'APARTMENT' | 'HOUSE' | 'BUNKHOUSE' | 'CAMPSITE';
  photoUrl: string | null;
  pricePerNightCents: number;
  currency: string;
  distanceKm: number;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  available: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  ROOM: 'Room',
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  BUNKHOUSE: 'Bunkhouse',
  CAMPSITE: 'Campsite',
};

const TYPE_ICONS: Record<string, IconName> = {
  ROOM: 'home',
  APARTMENT: 'grid',
  HOUSE: 'home',
  BUNKHOUSE: 'users',
  CAMPSITE: 'compass',
};

const TYPE_FILTERS = ['ALL', 'ROOM', 'APARTMENT', 'HOUSE', 'BUNKHOUSE', 'CAMPSITE'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

function useRentals(dropzoneId: string | number | undefined) {
  const dzParam = dropzoneId != null ? String(dropzoneId) : undefined;
  return useQuery({
    queryKey: ['rentals', dzParam],
    queryFn: async () => {
      const response = await api.get('/rentals/search', {
        params: { dropzoneId: dzParam },
      });
      const raw = (response.data ?? []) as any[];
      return raw.map((r: any) => ({
        id: String(r.id),
        title: r.title || '',
        type: (r.listingType === 'ROOM_SHARE' ? 'ROOM' : r.listingType === 'VILLA' ? 'HOUSE' : r.listingType) || 'ROOM',
        photoUrl: r.heroImageUrl || (r.photos?.[0]?.url ?? null),
        pricePerNightCents: Math.round(parseFloat(r.basePrice || '0') * 100),
        currency: r.currency || 'USD',
        distanceKm: r.distanceToDropzone ?? 0,
        rating: r._count?.reviews > 0 ? 4.5 : null,
        reviewCount: r._count?.reviews ?? 0,
        amenities: r.amenities || [],
        available: true,
      })) as Rental[];
    },
    enabled: dzParam != null,
    staleTime: 120000,
  });
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const filled = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <SLIcon key={i} name="star" size="xs" color={i < filled ? colors.accent.star : colors.gray[300]} />
      ))}
      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginLeft: spacing[1] }}>
        {rating.toFixed(1)} ({reviewCount})
      </Text>
    </View>
  );
}

export default function StaysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dropzoneId = useDropzoneStore((s) => s.activeDz?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('ALL');
  const { data: rentals, isLoading, error, refetch } = useRentals(dropzoneId);

  const filteredRentals = useMemo(() => {
    if (!rentals) return [];
    let result = rentals;
    if (activeType !== 'ALL') {
      result = result.filter((r) => r.type === activeType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    return result;
  }, [rentals, activeType, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatPrice = (cents: number, currency: string) => {
    const amount = (cents / 100).toFixed(0);
    return `${currency} ${amount}`;
  };

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Stays</Text>
        </View>
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeleton width="100%" height={200} />
          <SLSkeleton width="100%" height={200} />
          <SLSkeleton width="100%" height={200} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[3], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>Stays</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>Nearby accommodation for your jump trip</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ backgroundColor: colors.background, paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray[100], borderRadius: 8, paddingHorizontal: spacing[3] }}>
          <SLIcon name="search" size="sm" color={colors.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search stays..."
            placeholderTextColor={colors.text.tertiary}
            style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.text.primary, paddingVertical: spacing[2], marginLeft: spacing[2] }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <SLIcon name="x" size="sm" color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[2] }}>
        {TYPE_FILTERS.map((type) => (
          <Pressable key={type} onPress={() => setActiveType(type)}
            style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: activeType === type ? colors.brand.primary : colors.gray[100] }}>
            <SLIcon name={type === 'ALL' ? 'home' : (TYPE_ICONS[type] || 'home')} size="xs" color={activeType === type ? colors.text.inverse : colors.text.secondary} />
            <Text style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: activeType === type ? colors.text.inverse : colors.text.secondary }}>
              {type === 'ALL' ? 'All' : TYPE_LABELS[type] || type}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!dropzoneId ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="map-pin" title="No Dropzone Selected" description="Select an active dropzone to see nearby stays." />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Failed to Load Stays" description="There was a problem loading accommodation listings." actionLabel="Try Again" onAction={() => refetch()} />
        </View>
      ) : filteredRentals.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="home" title="No Stays Found" description={search.trim() ? 'Try adjusting your search or filters.' : 'No accommodation listed near this dropzone yet.'} />
        </View>
      ) : (
        <FlatList
          data={filteredRentals}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[4] }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/stays/${item.id}`)}>
              <SLCard shadow="sm" style={{ marginBottom: spacing[3], overflow: 'hidden' } as any}>
                {/* Photo placeholder */}
                <View style={{ height: 144, backgroundColor: colors.gray[200], alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 56, height: 56, backgroundColor: colors.gray[300], borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <SLIcon name={TYPE_ICONS[item.type] || 'home'} size="lg" color={colors.text.tertiary} />
                  </View>
                </View>
                <View style={{ padding: spacing[4] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: spacing[3] }}>
                      <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2 }}>
                        <SLIcon name="map-pin" size="xs" color={colors.text.tertiary} />
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                          {TYPE_LABELS[item.type] || item.type}  |  {item.distanceKm.toFixed(1)} km from DZ
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{formatPrice(item.pricePerNightCents, item.currency)}</Text>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>/night</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2] }}>
                    {item.rating !== null ? (
                      <StarRating rating={item.rating} reviewCount={item.reviewCount} />
                    ) : (
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>No reviews yet</Text>
                    )}
                    {!item.available && (
                      <SLBadge label="Unavailable" variant="error" />
                    )}
                  </View>
                </View>
              </SLCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
