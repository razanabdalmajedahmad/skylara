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
import { SLHeader, SLCard, SLBadge, SLAvatar, SLEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles: string[];
  isActive: boolean;
}

const roleBadgeVariant: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'neutral'> = {
  PILOT: 'primary',
  TI: 'secondary',
  AFFI: 'info',
  COACH: 'success',
  RIGGER: 'warning',
  MANIFEST: 'neutral',
};

function useStaff() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);
  return useQuery({
    queryKey: ['staff', dzId],
    queryFn: async () => {
      const res = await api.get('/admin/roles/users');
      return res.data as StaffMember[];
    },
    enabled: !!dzId,
    staleTime: 60000,
  });
}

export default function StaffScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: staff = [], isLoading, isError, refetch } = useStaff();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const activeStaff = staff.filter((s) => s.isActive);
  const inactiveStaff = staff.filter((s) => !s.isActive);
  const sections = [
    ...(activeStaff.length > 0 ? [{ title: `Active (${activeStaff.length})`, data: activeStaff }] : []),
    ...(inactiveStaff.length > 0 ? [{ title: `Inactive (${inactiveStaff.length})`, data: inactiveStaff }] : []),
  ];

  const flatData = sections.flatMap((section) => [
    { type: 'header' as const, title: section.title, id: `header-${section.title}` },
    ...section.data.map((item) => ({ type: 'item' as const, ...item })),
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SLHeader title="Staff" showBack rightIcon="refresh" onRightPress={() => refetch()} />

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-triangle" title="Failed to load staff" description="Pull down to retry" />
        </View>
      ) : staff.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="users" title="No Staff" description="No staff members found for this dropzone" />
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[2] }}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS !== 'web'
            ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
            : {})}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.secondary, marginTop: spacing[3], marginBottom: spacing[1] }}>
                  {item.title}
                </Text>
              );
            }

            const member = item as StaffMember & { type: 'item' };
            return (
              <SLCard padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <SLAvatar
                    firstName={member.firstName}
                    lastName={member.lastName}
                    uri={member.avatarUrl}
                    size="md"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[1] }}>
                      {member.roles.map((role) => (
                        <SLBadge
                          key={role}
                          label={role}
                          variant={roleBadgeVariant[role] || 'neutral'}
                          size="sm"
                        />
                      ))}
                    </View>
                  </View>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: member.isActive ? '#15803D' : colors.gray[300],
                    }}
                  />
                </View>
              </SLCard>
            );
          }}
        />
      )}
    </View>
  );
}
