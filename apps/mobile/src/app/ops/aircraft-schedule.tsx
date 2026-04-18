import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLHeader, SLCard, SLBadge, SLIcon, SLEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface Aircraft {
  id: string;
  registration: string;
  type: string;
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE';
  currentLoadNumber?: number;
  pilotName?: string;
  hobbsHours?: number;
  nextInspectionDue?: string;
}

function statusVariant(status: Aircraft['status']): 'success' | 'info' | 'warning' {
  switch (status) {
    case 'AVAILABLE': return 'success';
    case 'IN_FLIGHT': return 'info';
    case 'MAINTENANCE': return 'warning';
    default: return 'success';
  }
}

function statusLabel(status: Aircraft['status']): string {
  switch (status) {
    case 'AVAILABLE': return 'Available';
    case 'IN_FLIGHT': return 'In Flight';
    case 'MAINTENANCE': return 'MX';
    default: return status;
  }
}

function useAircraft() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  return useQuery({
    queryKey: ['aircraft', dzId],
    queryFn: async () => {
      const res = await api.get('/aircraft');
      return res.data as Aircraft[];
    },
    enabled: !!dzId,
    staleTime: 30000,
  });
}

export default function AircraftScheduleScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: aircraft = [], isLoading, isError, refetch } = useAircraft();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Aircraft Status" showBack rightIcon="refresh" onRightPress={() => refetch()} />

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-triangle" title="Failed to load aircraft" description="Pull down to retry" />
        </View>
      ) : aircraft.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="plane" title="No Aircraft" description="No aircraft configured for this dropzone" />
        </View>
      ) : (
        <FlatList
          data={aircraft}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          renderItem={({ item }) => (
            <SLCard padding="md">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                <View>
                  <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    {item.registration}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {item.type}
                  </Text>
                </View>
                <SLBadge label={statusLabel(item.status)} variant={statusVariant(item.status)} size="md" />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: spacing[1] }}>
                  {item.currentLoadNumber != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="clipboard-list" size="sm" color={colors.text.tertiary} />
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        Load #{item.currentLoadNumber}
                      </Text>
                    </View>
                  )}
                  {item.pilotName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                      <SLIcon name="user" size="sm" color={colors.text.tertiary} />
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {item.pilotName}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
                  {item.hobbsHours != null && (
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                      Hobbs: {item.hobbsHours.toFixed(1)} hrs
                    </Text>
                  )}
                  {item.nextInspectionDue && (
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                      Next MX: {item.nextInspectionDue}
                    </Text>
                  )}
                </View>
              </View>
            </SLCard>
          )}
        />
      )}
    </View>
  );
}
