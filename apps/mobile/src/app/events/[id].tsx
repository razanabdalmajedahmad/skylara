import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLEmptyState, SLButton } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';
import { AssistantModal } from '@/components/assistant/AssistantModal';

type PublicEventDetail = {
  id: number;
  title: string;
  subtitle: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  eventType: string | null;
  discipline: string | null;
  organizerName: string | null;
  country: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number | null;
  currentParticipants: number | null;
  minLicense: string | null;
  minJumps: number | null;
  depositRequired: boolean | null;
  dropzone: { id: number; name: string; slug: string } | null;
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [assistantVisible, setAssistantVisible] = useState(false);

  const numericId = parseInt(String(id), 10);

  const { data: event, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['public-event', numericId],
    queryFn: async () => {
      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error('Invalid event');
      }
      const res = await api.get<PublicEventDetail>(`/public/events/${numericId}`);
      return res.data as PublicEventDetail;
    },
    enabled: Number.isFinite(numericId) && numericId > 0,
    staleTime: 60_000,
  });

  const titleShort = useMemo(() => {
    const t = event?.title ?? '';
    if (t.length <= 42) return t;
    return `${t.slice(0, 39)}…`;
  }, [event?.title]);

  const assistantSuggestions = useMemo(() => {
    const label = titleShort ? ` for “${titleShort}”` : '';
    return [
      `Is this event or camp a good fit for my skill level${label}?`,
      `What should I prepare or train before attending${label}?`,
      `What should I pack or bring for this kind of event${label}?`,
      `What weather or travel risks should I think through${label}?`,
      `What registration, deposit, or waiver questions should I clarify${label}?`,
    ];
  }, [titleShort]);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        <SLEmptyState icon="alert-circle" title="Invalid event" description="Go back and pick an event from the list." actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: spacing[6], gap: spacing[3] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        <SLEmptyState
          icon="calendar"
          title="Event not found"
          description="This event may be unpublished or no longer available."
          actionLabel="Back to list"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const bodyText = event.fullDescription || event.shortDescription || '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }} numberOfLines={1}>
          Event
        </Text>
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

      <ScrollView
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => refetch()} tintColor={colors.brand.primary} />}
      >
        <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{event.title}</Text>
        {event.subtitle ? (
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[2] }}>{event.subtitle}</Text>
        ) : null}
        {event.dropzone?.name ? (
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[2] }}>
            {event.dropzone.name}
            {event.city ? ` · ${event.city}` : ''}
          </Text>
        ) : null}
        {(event.minLicense || event.minJumps != null) && (
          <SLCard padding="md" shadow="sm" style={{ marginTop: spacing[4] }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.secondary }}>REQUIREMENTS</Text>
            {event.minLicense ? (
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, marginTop: spacing[1] }}>License: {event.minLicense}</Text>
            ) : null}
            {event.minJumps != null ? (
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, marginTop: spacing[1] }}>Minimum jumps: {event.minJumps}</Text>
            ) : null}
          </SLCard>
        )}
        {bodyText ? (
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[4], lineHeight: Math.round(typography.lineHeight.sm * 1.2) }}>{bodyText}</Text>
        ) : null}
        <View style={{ marginTop: spacing[6] }}>
          <SLButton label="Ask about this event" onPress={() => setAssistantVisible(true)} iconLeft="cpu" />
        </View>
      </ScrollView>

      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        title="Event assistant"
        subtitle={event.title}
        context={{ currentRoute: '/mobile/events/[id]', currentPage: 'Event Detail' }}
        suggestions={assistantSuggestions}
      />
    </View>
  );
}
