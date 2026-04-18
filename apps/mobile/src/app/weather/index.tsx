import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWeather } from '@/hooks/useWeather';
import { useRealtimeWeather } from '@/hooks/useRealtimeWeather';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLCard, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const DAYS = ['M', 'Tu', 'W', 'Th', 'Today', 'Sa', 'Su'];
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);

const getWeatherIcon = (condition: string): IconName => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) return 'sun';
  if (lower.includes('cloud')) return 'cloud';
  if (lower.includes('rain')) return 'cloud-rain';
  if (lower.includes('wind')) return 'wind';
  if (lower.includes('storm')) return 'cloud-lightning';
  return 'sun';
};

const getWindDirectionIcon = (direction: string): IconName => {
  const lower = (direction || '').toLowerCase();
  if (lower.includes('n') && lower.includes('e')) return 'arrow-up-right';
  if (lower.includes('n') && lower.includes('w')) return 'arrow-up-left';
  if (lower.includes('s') && lower.includes('e')) return 'arrow-down-right';
  if (lower.includes('s') && lower.includes('w')) return 'arrow-down-left';
  if (lower.includes('n')) return 'arrow-up';
  if (lower.includes('s')) return 'arrow-down';
  if (lower.includes('e')) return 'arrow-right';
  if (lower.includes('w')) return 'arrow-left';
  return 'crosshair';
};

const getJumpabilityConfig = (jumpability: string) => {
  switch (jumpability) {
    case 'excellent': return { color: colors.brand.success, bg: colors.tint.success.bg, label: 'Excellent' };
    case 'good': return { color: colors.accent.emerald, bg: colors.tint.success.bg, label: 'Good' };
    case 'moderate': return { color: colors.brand.warning, bg: colors.tint.warning.bg, label: 'Marginal' };
    default: return { color: colors.brand.danger, bg: colors.tint.danger.bg, label: 'No-Go' };
  }
};

export default function WeatherScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(4);

  const { data: currentWeather, isLoading: weatherLoading, refetch: refetchWeather } = useWeather();
  useRealtimeWeather();

  const { refetch: refetchForecast } = useQuery({
    queryKey: ['weather-forecast', activeDz?.id],
    queryFn: async () => {
      if (!activeDz?.id) return null;
      const response = await api.get('/weather/forecast');
      return response.data;
    },
    enabled: !!activeDz?.id,
    staleTime: 600000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchWeather(), refetchForecast()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWeather, refetchForecast]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[3], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>Weather</Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>Conditions & jumpability</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        {...(Platform.OS !== 'web' ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> } : {})}
        showsVerticalScrollIndicator={false}
      >
        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
          contentContainerStyle={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4], gap: spacing[2] }}
        >
          {DAYS.map((day, index) => (
            <Pressable
              key={day}
              onPress={() => setSelectedDayIndex(index)}
              style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: 20,
                backgroundColor: selectedDayIndex === index ? colors.brand.primary : colors.gray[100],
              }}
            >
              <Text style={{
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                color: selectedDayIndex === index ? colors.text.inverse : colors.text.secondary,
              }}>
                {day}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Current Conditions */}
        {weatherLoading ? (
          <View style={{ padding: spacing[6], gap: spacing[4] }}>
            <SLSkeleton width="100%" height={240} />
            <SLSkeleton width="100%" height={100} />
            <SLSkeleton width="100%" height={300} />
          </View>
        ) : currentWeather ? (
          <>
            {/* Weather Hold Banner */}
            {currentWeather.weatherHold && (
              <View style={{
                marginHorizontal: spacing[6], marginTop: spacing[4],
                backgroundColor: colors.tint.danger.bg, borderWidth: 1, borderColor: colors.tint.danger.border,
                borderRadius: 8, padding: spacing[3],
                flexDirection: 'row', alignItems: 'center', gap: spacing[2],
              }}>
                <SLIcon name="alert-triangle" size="sm" color={colors.brand.danger} />
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.tint.danger.text, flex: 1 }}>
                  Weather Hold Active — {currentWeather.weatherHoldReason || 'High winds expected'}
                </Text>
              </View>
            )}

            <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[6] }}>
              {/* Weather Hero Card */}
              <SLCard padding="lg" style={{ marginBottom: spacing[6], alignItems: 'center' } as any}>
                <View style={{
                  width: 80, height: 80, backgroundColor: colors.sky[50],
                  borderRadius: 40, alignItems: 'center', justifyContent: 'center',
                  marginBottom: spacing[4],
                }}>
                  <SLIcon name={getWeatherIcon(currentWeather.condition)} size="lg" color={colors.brand.primary} />
                </View>

                <Text style={{ fontSize: 56, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[1] }}>
                  {Math.round(currentWeather.temperature)}°F
                </Text>
                <Text style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, marginBottom: spacing[4], textTransform: 'capitalize' }}>
                  {currentWeather.condition}
                </Text>

                {/* Wind Info */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing[2],
                  backgroundColor: colors.gray[50], paddingHorizontal: spacing[4],
                  paddingVertical: spacing[2], borderRadius: 20,
                }}>
                  <SLIcon name={getWindDirectionIcon(currentWeather.windDirection)} size="sm" color={colors.text.primary} />
                  <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {currentWeather.windSpeed} mph
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
                    {currentWeather.windDirection}
                  </Text>
                </View>
              </SLCard>

              {/* Jumpability */}
              {(() => {
                const jumpConfig = getJumpabilityConfig(currentWeather.jumpability);
                return (
                  <View style={{ marginBottom: spacing[6] }}>
                    <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                      JUMPABILITY
                    </Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 2,
                      height: 48, backgroundColor: colors.gray[100],
                      borderRadius: 8, overflow: 'hidden', padding: spacing[1],
                    }}>
                      {HOURS.map((hour, index) => (
                        <View key={hour} style={{
                          flex: 1, height: '100%', borderRadius: 4,
                          backgroundColor: jumpConfig.color,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {index === 0 && (
                            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>8am</Text>
                          )}
                          {index === HOURS.length - 1 && (
                            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>6pm</Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[3] }}>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>8:00 AM</Text>
                      <View style={{ backgroundColor: jumpConfig.bg, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 20 }}>
                        <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: jumpConfig.color }}>
                          {jumpConfig.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>6:00 PM</Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Hourly Forecast */}
            <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
                HOURLY FORECAST
              </Text>
              <SLCard style={{ overflow: 'hidden' } as any}>
                {HOURS.map((hour, index) => (
                  <View key={hour} style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
                    borderBottomWidth: index !== HOURS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.gray[100],
                  }}>
                    <Text style={{ width: 64, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                      {hour % 12 || 12}:{String(0).padStart(2, '0')} {hour < 12 ? 'AM' : 'PM'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1, marginLeft: spacing[4] }}>
                      <SLIcon name="sun" size="sm" color={colors.brand.primary} />
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, width: 48 }}>75%</Text>
                    </View>
                    <Text style={{ width: 80, textAlign: 'right', fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {Math.round(currentWeather.windSpeed)} mph
                    </Text>
                    <Text style={{ width: 48, textAlign: 'right', fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                      {Math.round(currentWeather.temperature)}°
                    </Text>
                  </View>
                ))}
              </SLCard>
            </View>

            {/* Attribution */}
            <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[8], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
              <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>
                Retrieved at 9:45 AM  •  Source: open-meteo.com
              </Text>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6], paddingVertical: spacing[8] }}>
            <SLEmptyState
              icon="cloud-off"
              title="Unable to Load Weather"
              description="Weather data is unavailable. Check your connection or try again."
              actionLabel="Retry"
              onAction={() => refetchWeather()}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
