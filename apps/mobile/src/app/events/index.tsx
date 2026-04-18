import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLIcon, SLCard, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';
import { useDropzoneStore } from '@/stores/dropzone';
import { usePublicEvents, type PublicEventListItem } from '@/hooks/usePublicEvents';
import { AssistantModal } from '@/components/assistant/AssistantModal';

function formatEventDates(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (s.getFullYear() !== e.getFullYear()) {
      opts.year = 'numeric';
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  } catch {
    return '';
  }
}

export default function EventsAndCampsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeDz = useDropzoneStore((s) => s.activeDz);
  const [assistantVisible, setAssistantVisible] = useState(false);

  const { data, isPending, error, refetch, isFetching } = usePublicEvents({
    dropzoneId: activeDz?.id,
    limit: 40,
  });

  const events = data?.events ?? [];

  const assistantSuggestions = useMemo(
    () => [
      'Is this type of camp or event likely right for my experience level?',
      'What should I prepare before a multi-day boogie or coaching camp?',
      'What should I pack for an event-heavy weekend at a dropzone?',
      'What weather or travel issues should I plan around?',
      'What registration or booking questions should I ask the organizer?',
    ],
    [],
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: PublicEventListItem }) => (
      <Pressable onPress={() => router.push(`/events/${item.id}`)}>
        <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[3] }}>
          <Text
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.dropzone?.name ? (
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }} numberOfLines={1}>
              {item.dropzone.name}
              {item.city ? ` · ${item.city}` : ''}
            </Text>
          ) : item.city ? (
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }} numberOfLines={1}>
              {item.city}
              {item.country ? `, ${item.country}` : ''}
            </Text>
          ) : null}
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing[2] }}>
            {formatEventDates(item.startDate, item.endDate)}
          </Text>
          {item.shortDescription ? (
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[2] }} numberOfLines={2}>
              {item.shortDescription}
            </Text>
          ) : null}
        </SLCard>
      </Pressable>
    ),
    [router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Events & Camps
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>
              Published boogies & camps
            </Text>
          </View>
          <Pressable
            onPress={() => setAssistantVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Open assistant"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.gray[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SLIcon name="cpu" size="sm" color={colors.brand.primary} />
          </Pressable>
        </View>
        {activeDz?.name ? (
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[2], textAlign: 'center' }}>
            Filtered for {activeDz.name} · Clear by changing home DZ
          </Text>
        ) : (
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[2], textAlign: 'center' }}>
            All public events · Set a home DZ to narrow the list
          </Text>
        )}
      </View>

      {isPending ? (
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="alert-circle"
            title="Could not load events"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="calendar"
            title="No upcoming events"
            description={
              activeDz
                ? 'No published events for your active dropzone yet. Try clearing the filter or check back later.'
                : 'No published public events right now. Check back later or pick a dropzone on Home.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginBottom: spacing[3] }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
              {data?.total != null && data.total > events.length ? ` (showing first ${events.length})` : ''}
            </Text>
          }
        />
      )}

      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        title="Events & camps"
        subtitle="Planning trips, boogies, and camps"
        context={{ currentRoute: '/mobile/events', currentPage: 'Events and Camps' }}
        suggestions={assistantSuggestions}
      />
    </View>
  );
}
