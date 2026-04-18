import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLAvatar, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeletonRow } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

export default function WhosGoingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const [isGoing, setIsGoing] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const { data: jumpers, isLoading, refetch } = useQuery({
    queryKey: ['whos-going', activeDz?.id],
    queryFn: async () => {
      if (!activeDz?.id) return { jumpers: [], count: 0 };
      const response = await api.get('/social/whos-going');
      return response.data;
    },
    enabled: !!activeDz?.id,
    refetchInterval: 30000,
  });

  const handleToggleGoing = async () => {
    setToggleLoading(true);
    try {
      if (!activeDz?.id) return;
      if (isGoing) {
        await api.post('/social/whos-going/remove');
      } else {
        await api.post('/social/whos-going/add');
      }
      setIsGoing(!isGoing);
      refetch();
    } catch {
      // Silently handle toggle failure
    } finally {
      setToggleLoading(false);
    }
  };

  const jumperList = jumpers?.jumpers || [];
  const totalCount = jumpers?.count || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[4],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Who's Going
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* I'm Going Toggle */}
        <Pressable
          onPress={handleToggleGoing}
          disabled={toggleLoading}
          style={{
            backgroundColor: isGoing ? colors.accent.star : colors.gray[100],
            borderRadius: 12,
            paddingVertical: spacing[4],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            opacity: toggleLoading ? 0.7 : 1,
          }}
        >
          <SLIcon
            name={isGoing ? 'check-circle' : 'plus-circle'}
            size="md"
            color={isGoing ? colors.text.primary : colors.text.secondary}
          />
          <Text
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              color: isGoing ? colors.text.primary : colors.text.secondary,
            }}
          >
            {isGoing ? "I'm Going!" : "I'm Not Going"}
          </Text>
        </Pressable>
      </View>

      {/* Jumpers Count Banner */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          backgroundColor: colors.sky[50],
          borderBottomWidth: 1,
          borderBottomColor: colors.sky[200],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        <SLIcon name="users" size="sm" color={colors.sky[700]} />
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.sky[700] }}>
          {totalCount} jumper{totalCount !== 1 ? 's' : ''} going today
        </Text>
      </View>

      {/* Jumpers List */}
      {isLoading ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonRow />
          <SLSkeletonRow />
          <SLSkeletonRow />
        </View>
      ) : (
        <FlatList
          data={jumperList}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing[6],
                paddingVertical: spacing[4],
                borderBottomWidth: 1,
                borderBottomColor: colors.gray[100],
                gap: spacing[3],
              }}
            >
              <SLAvatar
                firstName={item.firstName}
                lastName={item.lastName}
                size="md"
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                  }}
                >
                  {item.firstName} {item.lastName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
                  {item.licenseLevel && (
                    <SLBadge label={item.licenseLevel} variant="info" />
                  )}
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    going since {item.declaredAt || 'earlier'}
                  </Text>
                </View>
              </View>

              {/* Online indicator */}
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.brand.success,
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: spacing[16] || 64, paddingHorizontal: spacing[6] }}>
              <SLEmptyState
                icon="users"
                title="No One Yet"
                description="Be the first to declare you're going!"
                actionLabel="I'm Going!"
                onAction={handleToggleGoing}
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
