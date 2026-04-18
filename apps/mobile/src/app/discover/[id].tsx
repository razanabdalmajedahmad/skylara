import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLCard, SLIcon, SLBadge, SLButton, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard } from '@/components/ui/SLSkeleton';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useDropzoneDetail } from '@/hooks/useDiscoverDz';
import { useDropzoneStore } from '@/stores/dropzone';
import { AssistantModal } from '@/components/assistant/AssistantModal';

const FACILITY_ICONS: Record<string, IconName> = {
  packing: 'package',
  classroom: 'graduation-cap',
  shop: 'shopping-bag',
  restaurant: 'bed',
  camping: 'bed',
  hangar: 'building',
  video: 'camera',
  default: 'star',
};

function getFacilityIcon(facility: string): IconName {
  const key = facility.toLowerCase();
  for (const [k, v] of Object.entries(FACILITY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return FACILITY_ICONS.default;
}

export default function DropzoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setActiveDz = useDropzoneStore((s) => s.setActiveDz);
  const activeDzId = useDropzoneStore((s) => s.activeDz?.id);

  const { data: dz, isLoading, refetch } = useDropzoneDetail(id);
  const [refreshing, setRefreshing] = React.useState(false);
  const [assistantVisible, setAssistantVisible] = React.useState(false);

  const isHomeDz = activeDzId === dz?.id;

  const handleSetHome = () => {
    if (!dz) return;
    setActiveDz({
      id: dz.id,
      uuid: dz.uuid,
      name: dz.name,
      slug: dz.slug,
      icaoCode: dz.icaoCode,
      latitude: dz.latitude,
      longitude: dz.longitude,
      timezone: dz.timezone,
      currency: dz.currency,
      windLimitKnots: dz.windLimitKnots,
      status: dz.status,
      organization: dz.organization,
    });
  };

  const handleBookJump = () => {
    if (!dz) return;
    // Set this DZ as active first, then navigate to booking
    handleSetHome();
    router.push('/booking/new');
  };

  const assistantSuggestions = React.useMemo(() => {
    const name = dz?.name ? ` at ${dz.name}` : '';
    return [
      `Help me choose a first-time jump option${name}.`,
      `What should I know before booking${name}?`,
      `What are the key safety and weather considerations${name}?`,
      `What should I bring / prepare for my first day${name}?`,
    ];
  }, [dz?.name]);

  const handleCall = () => {
    if (dz?.phone) {
      Linking.openURL(`tel:${dz.phone}`);
    }
  };

  const handleWebsite = () => {
    if (dz?.website) {
      Linking.openURL(dz.website.startsWith('http') ? dz.website : `https://${dz.website}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: spacing[6], gap: spacing[4] }}>
          <SLSkeletonCard />
          <SLSkeletonCard />
          <SLSkeletonCard />
        </View>
      </View>
    );
  }

  if (!dz) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        <SLEmptyState
          icon="map-pin"
          title="Dropzone Not Found"
          description="This dropzone could not be loaded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[6],
          backgroundColor: colors.sky[900],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.inverse} />
          </Pressable>
          <Pressable onPress={handleWebsite} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="external-link" size="md" color={colors.text.inverse} />
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.inverse,
            marginBottom: spacing[1],
          }}
        >
          {dz.name}
        </Text>
        <Text
          style={{
            fontSize: typography.fontSize.base,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: spacing[3],
          }}
        >
          {dz.organization?.name}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <SLBadge
            label={dz.status === 'ACTIVE' ? 'Open' : dz.status}
            variant={dz.status === 'ACTIVE' ? 'success' : 'warning'}
          />
          {dz.icaoCode && (
            <SLBadge label={dz.icaoCode} variant="info" />
          )}
          <SLBadge label={dz.currency} variant="neutral" />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] }}>
          <SLCard padding="md" shadow="sm" style={{ flex: 1, alignItems: 'center' }}>
            <SLIcon name="wind" size="lg" color={colors.brand.primary} />
            <Text
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginTop: spacing[1],
              }}
            >
              {dz.windLimitKnots}kt
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              Wind Limit
            </Text>
          </SLCard>

          <SLCard padding="md" shadow="sm" style={{ flex: 1, alignItems: 'center' }}>
            <SLIcon name="globe" size="lg" color={colors.brand.primary} />
            <Text
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginTop: spacing[1],
              }}
            >
              {dz.timezone?.split('/').pop()?.replace(/_/g, ' ') || dz.timezone}
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              Timezone
            </Text>
          </SLCard>

          {dz.elevation !== undefined && (
            <SLCard padding="md" shadow="sm" style={{ flex: 1, alignItems: 'center' }}>
              <SLIcon name="arrow-up" size="lg" color={colors.brand.primary} />
              <Text
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing[1],
                }}
              >
                {dz.elevation}ft
              </Text>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                Elevation
              </Text>
            </SLCard>
          )}
        </View>

        {/* Description */}
        {dz.description && (
          <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing[2],
              }}
            >
              About
            </Text>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.sm,
              }}
            >
              {dz.description}
            </Text>
          </SLCard>
        )}

        {/* Aircraft */}
        {dz.aircraft && dz.aircraft.length > 0 && (
          <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing[3],
              }}
            >
              Aircraft
            </Text>
            {dz.aircraft.map((ac, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingVertical: spacing[2],
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                }}
              >
                <SLIcon name="plane" size="md" color={colors.brand.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {ac.name}
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    {ac.capacity} slots
                  </Text>
                </View>
              </View>
            ))}
          </SLCard>
        )}

        {/* Facilities */}
        {dz.facilities && dz.facilities.length > 0 && (
          <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing[3],
              }}
            >
              Facilities
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
              {dz.facilities.map((facility) => (
                <View
                  key={facility}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    backgroundColor: colors.gray[50],
                    borderRadius: radii.lg,
                    gap: spacing[1.5],
                  }}
                >
                  <SLIcon name={getFacilityIcon(facility)} size="sm" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    {facility}
                  </Text>
                </View>
              ))}
            </View>
          </SLCard>
        )}

        {/* Contact */}
        <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
          <Text
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[3],
            }}
          >
            Contact & Location
          </Text>

          <View style={{ gap: spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <SLIcon name="map-pin" size="md" color={colors.text.tertiary} />
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, flex: 1 }}>
                {dz.city ? `${dz.city}, ` : ''}{dz.country || `${dz.latitude.toFixed(4)}, ${dz.longitude.toFixed(4)}`}
              </Text>
            </View>

            {dz.phone && (
              <Pressable
                onPress={handleCall}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}
              >
                <SLIcon name="smartphone" size="md" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.brand.primary }}>
                  {dz.phone}
                </Text>
              </Pressable>
            )}

            {dz.website && (
              <Pressable
                onPress={handleWebsite}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}
              >
                <SLIcon name="external-link" size="md" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.brand.primary }} numberOfLines={1}>
                  {dz.website}
                </Text>
              </Pressable>
            )}
          </View>
        </SLCard>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={{
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[4],
          paddingBottom: insets.bottom + spacing[4],
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          gap: spacing[3],
        }}
      >
        <SLButton
          label="Ask"
          onPress={() => setAssistantVisible(true)}
          variant="outline"
          iconLeft="cpu"
        />
        <SLButton
          label={isHomeDz ? 'Home DZ' : 'Set as Home'}
          onPress={handleSetHome}
          variant={isHomeDz ? 'ghost' : 'outline'}
          iconLeft={isHomeDz ? 'check' : 'home'}
          disabled={isHomeDz}
        />
        <View style={{ flex: 1 }}>
          <SLButton
            label="Book a Jump"
            onPress={handleBookJump}
            size="lg"
            fullWidth
            iconRight="arrow-right"
          />
        </View>
      </View>

      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        title="Dropzone Assistant"
        subtitle={dz?.name ?? 'Discover'}
        context={{ currentRoute: '/mobile/discover/[id]', currentPage: 'Dropzone Detail' }}
        suggestions={assistantSuggestions}
      />
    </View>
  );
}
