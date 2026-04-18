import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/auth';
import { useDropzoneStore, type DropzoneState } from '@/stores/dropzone';
import { SLHeader, SLCard, SLBadge, SLEmptyState, SLButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { coachRegisterUrl, instructorRegisterUrl } from '@/lib/webAppUrl';

interface CoachAppRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  applicationType: string;
  status: string;
}

function canManageApplications(user: User | null): boolean {
  if (!user?.roles?.length) return false;
  const names = user.roles.map((r: { role: string }) => r.role);
  return names.some((r: string) => ['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'].includes(r));
}

function statusVariant(
  s: string,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const u = s.toUpperCase();
  if (u === 'APPROVED' || u === 'LIMITED_APPROVAL') return 'success';
  if (u === 'DOCUMENTS_MISSING') return 'warning';
  if (u === 'SUSPENDED' || u === 'ARCHIVED') return 'danger';
  if (u === 'SUBMITTED' || u === 'VERIFICATION_PENDING') return 'info';
  return 'neutral';
}

export default function ManagerOnboardingApplicationsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const activeDz = useDropzoneStore((s: DropzoneState) => s.activeDz);
  const canManage = useMemo(() => canManageApplications(user), [user]);
  const [tab, setTab] = useState<'coaches' | 'instructors'>('coaches');
  const [refreshing, setRefreshing] = useState(false);

  const coachesQuery = useQuery({
    queryKey: ['manager-coach-apps'],
    queryFn: async () => {
      const res = await api.get('/onboarding/coaches');
      return (res.data as CoachAppRow[]) || [];
    },
    enabled: canManage,
  });

  const instructorsQuery = useQuery({
    queryKey: ['manager-instructor-apps'],
    queryFn: async () => {
      const res = await api.get('/onboarding/instructors');
      return (res.data as CoachAppRow[]) || [];
    },
    enabled: canManage,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'coach' | 'instructor' }) => {
      const path =
        kind === 'coach'
          ? `/onboarding/coaches/${id}/approve`
          : `/onboarding/instructors/${id}/approve`;
      await api.post(path, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-coach-apps'] });
      queryClient.invalidateQueries({ queryKey: ['manager-instructor-apps'] });
    },
  });

  const requestDocsMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'coach' | 'instructor' }) => {
      const path =
        kind === 'coach'
          ? `/onboarding/coaches/${id}/request-docs`
          : `/onboarding/instructors/${id}/request-docs`;
      await api.post(path, { notes: 'Additional documents required.' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-coach-apps'] });
      queryClient.invalidateQueries({ queryKey: ['manager-instructor-apps'] });
    },
  });

  const list = tab === 'coaches' ? coachesQuery.data ?? [] : instructorsQuery.data ?? [];
  const loading = tab === 'coaches' ? coachesQuery.isLoading : instructorsQuery.isLoading;
  const isError = tab === 'coaches' ? coachesQuery.isError : instructorsQuery.isError;
  const refetch = tab === 'coaches' ? coachesQuery.refetch : instructorsQuery.refetch;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([coachesQuery.refetch(), instructorsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [coachesQuery, instructorsQuery]);

  const openRegisterUrl = useCallback(
    (kind: 'coach' | 'instructor') => {
      const dzId = activeDz?.id;
      const url =
        kind === 'coach' ? coachRegisterUrl(dzId) : instructorRegisterUrl(dzId);
      Linking.openURL(url).catch(() => {
        Alert.alert('Could not open link', 'Set EXPO_PUBLIC_WEB_URL to your web app URL.');
      });
    },
    [activeDz?.id],
  );

  if (!canManage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <SLHeader title="Applications" showBack />
        <View style={{ padding: spacing[6] }}>
          <SLEmptyState
            icon="lock"
            title="No access"
            description="Coach and instructor application review is available to dropzone managers and owners."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Coach & Instructor Apps" showBack rightIcon="refresh" onRightPress={() => refetch()} />

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
          gap: spacing[2],
        }}
      >
        {(['coaches', 'instructors'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: spacing[2],
              borderRadius: 8,
              backgroundColor: tab === t ? colors.brand.primary : colors.gray[100],
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: tab === t ? '#fff' : colors.text.secondary,
              }}
            >
              {t === 'coaches' ? 'Coaches' : 'Instructors'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[2] }}>
          Active DZ: {activeDz?.name ?? 'None selected'} — share public registration links with candidates.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
          <SLButton
            label="Open coach form"
            variant="outline"
            size="sm"
            onPress={() => openRegisterUrl('coach')}
          />
          <SLButton
            label="Open instructor form"
            variant="outline"
            size="sm"
            onPress={() => openRegisterUrl('instructor')}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="alert-triangle"
            title="Could not load applications"
            description="Check your connection and permissions, then pull to refresh."
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[10] }}
          refreshControl={
            Platform.OS !== 'web' ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
            ) : undefined
          }
          ListEmptyComponent={
            <SLEmptyState
              icon="clipboard-list"
              title="No applications"
              description={`No ${tab} pending for your scope.`}
            />
          }
          renderItem={({ item }) => {
            const kind = tab === 'coaches' ? 'coach' : 'instructor';
            const busy =
              approveMutation.isPending ||
              requestDocsMutation.isPending;
            const canAct =
              item.status !== 'APPROVED' &&
              item.status !== 'LIMITED_APPROVAL' &&
              item.status !== 'ARCHIVED';
            return (
              <SLCard style={{ marginBottom: spacing[3] }}>
                <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary }}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 }}>
                  {item.email}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }}>
                  <SLBadge label={item.applicationType} variant="secondary" size="sm" />
                  <SLBadge label={item.status.replace(/_/g, ' ')} variant={statusVariant(item.status)} size="sm" />
                </View>
                {canAct && (
                  <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
                    <Pressable
                      onPress={() => approveMutation.mutate({ id: item.id, kind })}
                      disabled={busy}
                      style={{
                        flex: 1,
                        paddingVertical: spacing[2],
                        backgroundColor: '#DCFCE7',
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#15803D', fontWeight: '600', fontSize: 13 }}>Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => requestDocsMutation.mutate({ id: item.id, kind })}
                      disabled={busy}
                      style={{
                        flex: 1,
                        paddingVertical: spacing[2],
                        backgroundColor: '#FEF3C7',
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#A16207', fontWeight: '600', fontSize: 13 }}>Request docs</Text>
                    </Pressable>
                  </View>
                )}
              </SLCard>
            );
          }}
        />
      )}
    </View>
  );
}
