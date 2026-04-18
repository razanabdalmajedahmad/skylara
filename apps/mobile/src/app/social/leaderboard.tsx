import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { useAuthStore } from '@/stores/auth';
import { SLIcon, SLAvatar, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';

type Period = 'WEEK' | 'MONTH' | 'ALL_TIME';
type Category = 'MOST_JUMPS' | 'LONGEST_STREAK' | 'MOST_DISCIPLINES';

const CATEGORY_ICONS: Record<Category, IconName> = {
  MOST_JUMPS: 'plane',
  LONGEST_STREAK: 'flame',
  MOST_DISCIPLINES: 'award',
};

function getMedalColor(position: number): string {
  switch (position) {
    case 0: return colors.accent.gold;
    case 1: return colors.accent.silver;
    case 2: return colors.accent.bronze;
    default: return colors.text.tertiary;
  }
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('WEEK');
  const [category, setCategory] = useState<Category>('MOST_JUMPS');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', activeDz?.id, period, category],
    queryFn: async () => {
      if (!activeDz?.id) return { entries: [] };
      const response = await api.get('/social/leaderboard', {
        params: { period, category },
      });
      const raw = response.data as any;
      const entries = (raw?.entries || []).map((e: any) => ({
        ...e,
        score: e.value ?? e.score ?? 0,
      }));
      return { entries };
    },
    enabled: !!activeDz?.id,
  });

  const entries = leaderboard?.entries || [];

  const getCategoryLabel = (cat: Category) => {
    switch (cat) {
      case 'MOST_JUMPS': return 'Most Jumps';
      case 'LONGEST_STREAK': return 'Longest Streak';
      case 'MOST_DISCIPLINES': return 'Most Disciplines';
    }
  };

  const getScoreUnit = () => {
    switch (category) {
      case 'MOST_JUMPS': return 'jumps';
      case 'LONGEST_STREAK': return 'days';
      case 'MOST_DISCIPLINES': return 'disciplines';
    }
  };

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
            Leaderboard
          </Text>
          <SLIcon name="trophy" size="md" color={colors.brand.primary} />
        </View>

        {/* Period Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], marginBottom: spacing[3] }}
        >
          {(['WEEK', 'MONTH', 'ALL_TIME'] as Period[]).map((p) => {
            const isActive = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
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
                  {p === 'WEEK' ? 'This Week' : p === 'MONTH' ? 'This Month' : 'All Time'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Category Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {(['MOST_JUMPS', 'LONGEST_STREAK', 'MOST_DISCIPLINES'] as Category[]).map((cat) => {
            const isActive = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1.5] || 6,
                  borderRadius: radii.full,
                  backgroundColor: isActive ? colors.sky[50] : 'transparent',
                  borderWidth: 1,
                  borderColor: isActive ? colors.brand.primary : colors.border,
                }}
              >
                <SLIcon name={CATEGORY_ICONS[cat]} size="xs" color={isActive ? colors.brand.primary : colors.text.tertiary} />
                <Text
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: isActive ? colors.brand.primary : colors.text.secondary,
                  }}
                >
                  {getCategoryLabel(cat)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Leaderboard List */}
      {isLoading ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => `${item.userId}-${index}`}
          renderItem={({ item, index }) => {
            const isCurrentUser = item.userId === user?.id;
            const isTopThree = index < 3;

            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing[6],
                  paddingVertical: spacing[4],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                  backgroundColor: isCurrentUser ? colors.sky[50] : 'transparent',
                  gap: spacing[4],
                }}
              >
                {/* Position */}
                <View style={{ width: 36, alignItems: 'center' }}>
                  {isTopThree ? (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: `${getMedalColor(index)}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SLIcon name="trophy" size="sm" color={getMedalColor(index)} />
                    </View>
                  ) : (
                    <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary }}>
                      #{index + 1}
                    </Text>
                  )}
                </View>

                {/* Avatar & Name */}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <SLAvatar
                    firstName={item.firstName}
                    lastName={item.lastName}
                    size="md"
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: isCurrentUser ? typography.fontWeight.bold : typography.fontWeight.semibold,
                        color: isCurrentUser ? colors.brand.primary : colors.text.primary,
                      }}
                    >
                      {item.firstName} {item.lastName}
                    </Text>
                    {item.licenseLevel && (
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                        {item.licenseLevel}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Score */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
                    {item.score}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    {getScoreUnit()}
                  </Text>
                </View>

                {isCurrentUser && (
                  <SLBadge label="YOU" variant="info" />
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: spacing[16] || 64, paddingHorizontal: spacing[6] }}>
              <SLEmptyState
                icon="trophy"
                title="No Data Yet"
                description="Leaderboard will populate as jumpers complete jumps"
              />
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[20] || 80 }}
        />
      )}
    </View>
  );
}
