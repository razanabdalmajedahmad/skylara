import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useWeather } from '@/hooks/useWeather';
import { useRealtimeWeather } from '@/hooks/useRealtimeWeather';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLCard, SLStatusBadge, SLProgressBar, SLIcon, SLEmptyState } from '@/components/ui';
import { SLSkeletonCard, SLSkeletonStats } from '@/components/ui/SLSkeleton';
import { colors, spacing, typography } from '@/theme';

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);

export default function WeatherTabScreen() {
  const { activeDz } = useDropzoneStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: currentWeather, isLoading: weatherLoading, refetch: refetchWeather } = useWeather();
  useRealtimeWeather();

  const { data: holds, refetch: refetchHolds } = useQuery({
    queryKey: ['weather-holds', activeDz?.id],
    queryFn: async () => {
      if (!activeDz?.id) return [];
      const response = await api.get('/weather/holds');
      return response.data;
    },
    enabled: !!activeDz?.id,
    staleTime: 30000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchWeather(), refetchHolds()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWeather, refetchHolds]);

  const getJumpabilityColor = (j: string) => {
    switch (j) {
      case 'excellent': return colors.brand.success;
      case 'good': return colors.brand.primary;
      case 'moderate': return colors.brand.warning;
      default: return colors.brand.danger;
    }
  };

  const getJumpabilityProgress = (j: string) => {
    switch (j) {
      case 'excellent': return 1;
      case 'good': return 0.75;
      case 'moderate': return 0.5;
      default: return 0.25;
    }
  };

  const activeHolds = Array.isArray(holds) ? holds.filter((h: any) => !h.clearedAt) : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing[8] }}
      showsVerticalScrollIndicator={false}
      {...(Platform.OS !== 'web'
        ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
        : {})}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6], paddingBottom: spacing[4] }}>
        <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
          Weather
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[0.5] }}>
          {activeDz?.name || 'No DZ Selected'}
        </Text>
      </View>

      {/* Active Weather Hold Banner */}
      {activeHolds.length > 0 && (
        <View style={{ paddingHorizontal: spacing[6], marginBottom: spacing[4] }}>
          <SLCard padding="md" style={{ backgroundColor: colors.tint.danger.bg, borderColor: colors.tint.danger.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <SLIcon name="alert-triangle" size="lg" color={colors.brand.danger} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.accent.deepRed }}>
                  Weather Hold Active
                </Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.tint.danger.text, marginTop: 2 }}>
                  {activeHolds[0]?.reason || 'Operations paused due to weather'}
                </Text>
              </View>
            </View>
          </SLCard>
        </View>
      )}

      {/* Current Conditions */}
      {weatherLoading ? (
        <View style={{ paddingHorizontal: spacing[6] }}>
          <SLSkeletonCard height={200} />
          <SLSkeletonStats />
        </View>
      ) : currentWeather ? (
        <View style={{ paddingHorizontal: spacing[6] }}>
          {/* Hero Card */}
          <SLCard padding="lg" shadow="md" style={{ marginBottom: spacing[4] }}>
            <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
              <SLIcon
                name={
                  (currentWeather.condition || '').toLowerCase().includes('rain') ? 'cloud-rain' :
                  (currentWeather.condition || '').toLowerCase().includes('cloud') ? 'cloud' :
                  (currentWeather.condition || '').toLowerCase().includes('wind') ? 'wind' : 'sun'
                }
                size="3xl"
                color={colors.brand.primary}
              />
              <Text style={{ fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[2] }}>
                {Math.round(currentWeather.temperature)}°
              </Text>
              <Text style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, textTransform: 'capitalize' }}>
                {currentWeather.condition}
              </Text>
            </View>

            {/* Wind Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ alignItems: 'center' }}>
                <SLIcon name="wind" size="md" color={colors.text.tertiary} />
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[1] }}>
                  {currentWeather.windSpeed}
                </Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>km/h {currentWeather.windDirection}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <SLIcon name="droplets" size="md" color={colors.text.tertiary} />
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[1] }}>
                  {currentWeather.humidity ?? '--'}%
                </Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Humidity</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <SLIcon name="thermometer" size="md" color={colors.text.tertiary} />
                <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[1] }}>
                  {currentWeather.feelsLike ?? currentWeather.temperature}°
                </Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Feels like</Text>
              </View>
            </View>
          </SLCard>

          {/* Jumpability Card */}
          <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>JUMPABILITY</Text>
              <SLStatusBadge status={currentWeather.jumpability} />
            </View>
            <SLProgressBar
              progress={getJumpabilityProgress(currentWeather.jumpability)}
              color={getJumpabilityColor(currentWeather.jumpability)}
              height={8}
            />
          </SLCard>

          {/* Hourly Forecast */}
          <SLCard padding="md" shadow="sm">
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3] }}>
              HOURLY FORECAST
            </Text>
            {HOURS.map((hour, index) => (
              <View
                key={hour}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing[2.5],
                  ...(index !== HOURS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.gray[100] } : {}),
                }}
              >
                <Text style={{ width: 60, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {hour % 12 || 12}:00 {hour < 12 ? 'AM' : 'PM'}
                </Text>
                <SLIcon
                  name={hour < 10 || hour > 16 ? 'cloud' : 'sun'}
                  size="sm"
                  color={colors.text.tertiary}
                />
                <Text style={{ width: 60, textAlign: 'right', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {Math.round(currentWeather.windSpeed)} km/h
                </Text>
                <Text style={{ width: 40, textAlign: 'right', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  {Math.round(currentWeather.temperature)}°
                </Text>
              </View>
            ))}
          </SLCard>
        </View>
      ) : (
        <SLEmptyState
          icon="cloud"
          title="No Weather Data"
          description="Select a dropzone to view current conditions"
        />
      )}
    </ScrollView>
  );
}
