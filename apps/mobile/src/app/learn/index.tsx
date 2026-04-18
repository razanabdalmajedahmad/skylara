import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLEmptyState, SLProgressBar } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  moduleCount: number;
  progressPercent: number;
  durationMinutes: number;
  level: string;
}

const CATEGORIES = ['ALL', 'SAFETY', 'AFF', 'COACHING', 'CANOPY', 'WINGSUIT', 'FREEFLY', 'CRW'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICONS: Record<string, IconName> = {
  ALL: 'book-open', SAFETY: 'siren', AFF: 'wind', COACHING: 'award',
  CANOPY: 'wind', WINGSUIT: 'wind', FREEFLY: 'target', CRW: 'link',
};

function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/learning/browse');
      const raw = (response.data ?? []) as any[];
      return raw.map((c: any) => ({
        id: String(c.id),
        title: c.title,
        description: c.description || '',
        category: c.category || 'GENERAL',
        thumbnailUrl: c.thumbnailUrl || null,
        moduleCount: c.moduleCount ?? 0,
        progressPercent: 0,
        durationMinutes: (c.estimatedHours ?? 0) * 60,
        level: c.level || 'BEGINNER',
      })) as Course[];
    },
    staleTime: 120000,
  });
}

export default function LearnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const { data: courses, isLoading, error, refetch } = useCourses();

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (activeCategory === 'ALL') return courses;
    return courses.filter((c) => c.category === activeCategory);
  }, [courses, activeCategory]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[3], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>Learn</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>Courses & skill development</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[2] }}>
        {CATEGORIES.map((cat) => (
          <Pressable key={cat} onPress={() => setActiveCategory(cat)}
            style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: activeCategory === cat ? colors.brand.primary : colors.gray[100] }}>
            <SLIcon name={CATEGORY_ICONS[cat] || 'book-open'} size="xs" color={activeCategory === cat ? colors.text.inverse : colors.text.secondary} />
            <Text style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: activeCategory === cat ? colors.text.inverse : colors.text.secondary }}>
              {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && !refreshing ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}><SLSkeleton width="100%" height={100} /><SLSkeleton width="100%" height={100} /><SLSkeleton width="100%" height={100} /></View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Failed to Load Courses" description="There was a problem loading courses." actionLabel="Try Again" onAction={() => refetch()} />
        </View>
      ) : filteredCourses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="book-open" title="No Courses Found" description={activeCategory === 'ALL' ? 'Courses will be available soon.' : `No ${activeCategory.toLowerCase()} courses available yet.`} />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[4] }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/learn/${item.id}`)}>
              <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[3] } as any}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] }}>
                  <View style={{ width: 48, height: 48, backgroundColor: colors.sky[50], borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <SLIcon name={CATEGORY_ICONS[item.category] || 'book-open'} size="md" color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{item.title}</Text>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                      {item.moduleCount} modules  |  {item.durationMinutes} min  |  {item.level}
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }} numberOfLines={2}>{item.description}</Text>
                  </View>
                </View>
                <View style={{ marginTop: spacing[3] }}>
                  <SLProgressBar value={item.progressPercent} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1], textAlign: 'right' }}>{item.progressPercent}% complete</Text>
                </View>
              </SLCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
