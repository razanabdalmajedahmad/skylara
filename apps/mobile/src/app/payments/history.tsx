import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '@/hooks/useTransactions';
import { SLIcon, SLButton, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';

type FilterType = 'ALL' | 'PURCHASES' | 'REFUNDS' | 'TOPUPS';
type DateRange = 'WEEK' | 'MONTH' | 'CUSTOM';

function getTransactionIcon(type: string): IconName {
  switch (type) {
    case 'PURCHASE': return 'ticket';
    case 'TOPUP': return 'plus-circle';
    case 'REFUND': return 'rotate-ccw';
    default: return 'credit-card';
  }
}

function getTransactionLabel(type: string): string {
  switch (type) {
    case 'PURCHASE': return 'Jump Ticket Purchase';
    case 'TOPUP': return 'Account Top Up';
    case 'REFUND': return 'Refund';
    default: return 'Transaction';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('MONTH');

  const { data, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTransactions({
      type:
        activeFilter === 'ALL'
          ? undefined
          : activeFilter === 'PURCHASES'
            ? 'PURCHASE'
            : activeFilter === 'TOPUPS'
              ? 'TOPUP'
              : 'REFUND',
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const transactions = data?.pages?.flatMap((page) => page.data) || [];

  const formatAmount = (cents: number, type: string, currency: string) => {
    const amount = (cents / 100).toFixed(2);
    const symbol = currency === 'AED' ? '\u062F.\u0625' : currency;
    const isCredit = type === 'TOPUP' || type === 'REFUND';

    return {
      text: `${isCredit ? '+' : '-'}${symbol} ${amount}`,
      color: isCredit ? colors.brand.success : colors.brand.danger,
    };
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
            Transactions
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], marginBottom: spacing[3] }}
        >
          {(['ALL', 'PURCHASES', 'TOPUPS', 'REFUNDS'] as FilterType[]).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
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
                  {filter === 'ALL' ? 'All' : filter === 'PURCHASES' ? 'Purchases' : filter === 'TOPUPS' ? 'Top-ups' : 'Refunds'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Date Range */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary }}>
            PERIOD:
          </Text>
          {(['WEEK', 'MONTH', 'CUSTOM'] as DateRange[]).map((range) => {
            const isActive = dateRange === range;
            return (
              <Pressable
                key={range}
                onPress={() => setDateRange(range)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radii.full,
                  backgroundColor: isActive ? colors.sky[50] : 'transparent',
                  borderWidth: 1,
                  borderColor: isActive ? colors.brand.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: isActive ? colors.brand.primary : colors.text.secondary,
                  }}
                >
                  {range === 'WEEK' ? 'This Week' : range === 'MONTH' ? 'This Month' : 'Custom'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Transactions List */}
      {isLoading && !refreshing ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          renderItem={({ item }) => {
            const { text, color } = formatAmount(item.amountCents, item.type, item.currency || 'AED');

            return (
              <View
                style={{
                  paddingHorizontal: spacing[6],
                  paddingVertical: spacing[4],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[3] }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.gray[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SLIcon name={getTransactionIcon(item.type)} size="md" color={colors.text.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {getTransactionLabel(item.type)}
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color }}>
                    {text}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {item.currency ?? 'USD'}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: spacing[16] || 64, paddingHorizontal: spacing[6] }}>
              <SLEmptyState
                icon="credit-card"
                title="No Transactions"
                description={`You don't have any ${activeFilter === 'ALL' ? 'transactions' : activeFilter.toLowerCase()} yet`}
              />
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ padding: spacing[4], alignItems: 'center' }}>
                <SLSkeletonRow />
              </View>
            ) : hasNextPage ? (
              <View style={{ padding: spacing[6] }}>
                <SLButton
                  label="Load More"
                  onPress={() => fetchNextPage()}
                  variant="outline"
                  fullWidth
                />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[20] || 80 }}
        />
      )}
    </View>
  );
}
