import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface Job {
  id: string;
  title: string;
  dropzoneName: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL' | 'CONTRACT';
  status: 'PUBLISHED' | 'CLOSED';
  postedAt: string;
  salaryRange: string | null;
  tags: string[];
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-Time', PART_TIME: 'Part-Time', SEASONAL: 'Seasonal', CONTRACT: 'Contract',
};

function useJobs() {
  return useQuery({
    queryKey: ['careers', 'jobs'],
    queryFn: async () => {
      const response = await api.get('/careers/browse');
      const raw = (response.data ?? []) as any[];
      // Map API shape → Job interface
      return raw.map((j: any) => ({
        id: String(j.id),
        title: j.title,
        dropzoneName: j.dropzone?.name || 'Unknown DZ',
        location: j.location || 'On-site',
        employmentType: j.employmentType,
        status: j.status,
        postedAt: j.createdAt,
        salaryRange: j.compensation
          ? (() => {
              try {
                const comp = typeof j.compensation === 'string' ? JSON.parse(j.compensation) : j.compensation;
                if (comp.min && comp.max) return `$${comp.min}-$${comp.max}/${comp.period || 'yr'}`;
                return null;
              } catch { return null; }
            })()
          : null,
        tags: (() => {
          try {
            const reqs = typeof j.requirements === 'string' ? JSON.parse(j.requirements) : j.requirements;
            return Array.isArray(reqs) ? reqs.slice(0, 3) : [];
          } catch { return []; }
        })(),
      })) as Job[];
    },
    staleTime: 120000,
  });
}

function timeAgo(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}

export default function CareersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data: jobs, isLoading, error, refetch } = useJobs();

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>Careers</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>Jobs and opportunities</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {isLoading && !refreshing ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeleton width="100%" height={100} />
          <SLSkeleton width="100%" height={100} />
          <SLSkeleton width="100%" height={100} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Failed to Load Jobs" description="There was a problem loading job listings." actionLabel="Try Again" onAction={() => refetch()} />
        </View>
      ) : !jobs || jobs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="briefcase" title="No Open Positions" description="Check back later for new job postings." />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[4] }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/careers/${item.id}`)}>
              <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[3] } as any}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                  <View style={{ flex: 1, marginRight: spacing[3] }}>
                    <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary, fontSize: typography.fontSize.base }}>{item.title}</Text>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 }}>{item.dropzoneName}</Text>
                  </View>
                  <SLBadge label={item.status} variant={item.status === 'PUBLISHED' ? 'success' : 'info'} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[1] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                    <SLIcon name="map-pin" size="xs" color={colors.text.tertiary} />
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{item.location}</Text>
                  </View>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.brand.primary, fontWeight: typography.fontWeight.semibold }}>
                    {EMPLOYMENT_LABELS[item.employmentType] || item.employmentType}
                  </Text>
                </View>
                {item.salaryRange && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] }}>
                    <SLIcon name="credit-card" size="xs" color={colors.text.tertiary} />
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{item.salaryRange}</Text>
                  </View>
                )}
                {item.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[2] }}>
                    {item.tags.slice(0, 3).map((tag) => (
                      <View key={tag} style={{ backgroundColor: colors.sky[50], paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.brand.primary }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[2] }}>Posted {timeAgo(item.postedAt)}</Text>
              </SLCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
