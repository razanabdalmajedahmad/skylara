import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLHeader, SLCard, SLEmptyState } from '@/components/ui';
import { colors, spacing, typography, radii } from '@/theme';

type ReportType = 'revenue' | 'loads' | 'utilization';
type DateRange = 'today' | 'week' | 'month';

interface ReportData {
  summary: { label: string; value: string }[];
}

const reportTypes: { label: string; value: ReportType }[] = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Loads', value: 'loads' },
  { label: 'Utilization', value: 'utilization' },
];

const dateRanges: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

function useReport(type: ReportType, range: DateRange) {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  return useQuery({
    queryKey: ['report', dzId, type, range],
    queryFn: async () => {
      const res = await api.get(`/reports/${type}`, { params: { range } });
      return res.data as ReportData;
    },
    enabled: !!dzId,
    staleTime: 60000,
  });
}

export default function ReportsScreen() {
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [refreshing, setRefreshing] = useState(false);

  const { data: report, isLoading, isError, refetch } = useReport(reportType, dateRange);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Reports" showBack rightIcon="refresh" onRightPress={() => refetch()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      >
        {/* Report Type Selector */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.secondary, marginBottom: spacing[2] }}>
          REPORT TYPE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], marginBottom: spacing[4] }}
        >
          {reportTypes.map((rt) => (
            <Pressable
              key={rt.value}
              onPress={() => setReportType(rt.value)}
              style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: radii.full,
                backgroundColor: reportType === rt.value ? colors.brand.primary : colors.gray[100],
              }}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: reportType === rt.value ? colors.text.inverse : colors.text.secondary }}>
                {rt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Date Range Selector */}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.secondary, marginBottom: spacing[2] }}>
          DATE RANGE
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] }}>
          {dateRanges.map((dr) => (
            <Pressable
              key={dr.value}
              onPress={() => setDateRange(dr.value)}
              style={{
                flex: 1,
                paddingVertical: spacing[2],
                borderRadius: radii.lg,
                backgroundColor: dateRange === dr.value ? colors.brand.primary : colors.gray[100],
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: dateRange === dr.value ? colors.text.inverse : colors.text.secondary }}>
                {dr.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Report Content */}
        {isLoading ? (
          <View style={{ paddingVertical: spacing[8], alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        ) : isError ? (
          <SLCard padding="md">
            <SLEmptyState icon="alert-triangle" title="Failed to load report" description="Try a different report type or pull to refresh" />
          </SLCard>
        ) : !report?.summary?.length ? (
          <SLCard padding="md">
            <SLEmptyState icon="bar-chart" title="No Data" description={`No ${reportType} data for the selected period`} />
          </SLCard>
        ) : (
          <View style={{ gap: spacing[3] }}>
            {report.summary.map((item, idx) => (
              <SLCard key={idx} padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    {item.value}
                  </Text>
                </View>
              </SLCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
