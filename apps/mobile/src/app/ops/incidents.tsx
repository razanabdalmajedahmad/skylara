import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLHeader, SLCard, SLBadge, SLIcon, SLEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

type Severity = 'MINOR' | 'MODERATE' | 'SEVERE';
type IncidentStatus = 'REPORTED' | 'UNDER_REVIEW' | 'CLOSED';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  reporterName: string;
  createdAt: string;
}

function severityVariant(severity: Severity): 'warning' | 'danger' | 'info' {
  switch (severity) {
    case 'MINOR': return 'info';
    case 'MODERATE': return 'warning';
    case 'SEVERE': return 'danger';
    default: return 'info';
  }
}

function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case 'REPORTED': return 'Reported';
    case 'UNDER_REVIEW': return 'Under Review';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

function statusVariant(status: IncidentStatus): 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'REPORTED': return 'warning';
    case 'UNDER_REVIEW': return 'info';
    case 'CLOSED': return 'neutral';
    default: return 'neutral';
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function useIncidents() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  return useQuery({
    queryKey: ['incidents', dzId],
    queryFn: async () => {
      const res = await api.get('/incidents', {
        params: { status: 'REPORTED,UNDER_REVIEW' },
      });
      return res.data as Incident[];
    },
    enabled: !!dzId,
    staleTime: 30000,
  });
}

export default function IncidentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Incident Queue" showBack rightIcon="refresh" onRightPress={() => refetch()} />

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-triangle" title="Failed to load incidents" description="Pull down to retry" />
        </View>
      ) : incidents.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="check-circle" title="No Open Incidents" description="All clear. No reported or under-review incidents." />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          renderItem={({ item }) => (
            <SLCard
              padding="md"
              onPress={() => router.push(`/ops/incident-detail?incidentId=${item.id}` as any)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <View style={{ flex: 1, marginRight: spacing[3] }}>
                  <Text
                    style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
                <SLBadge label={item.severity} variant={severityVariant(item.severity)} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <SLIcon name="user" size="sm" color={colors.text.tertiary} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                    {item.reporterName}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                <SLBadge label={statusLabel(item.status)} variant={statusVariant(item.status)} size="sm" />
              </View>
            </SLCard>
          )}
        />
      )}
    </View>
  );
}
