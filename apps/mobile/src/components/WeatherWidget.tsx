import React from 'react';
import { View, Text } from 'react-native';
import { SLCard, SLProgressBar, SLIcon } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  condition: string;
  jumpability: 'excellent' | 'good' | 'moderate' | 'poor';
}

export default function WeatherWidget({ weather }: { weather: WeatherData }) {
  const getJumpabilityColor = (jumpability: string) => {
    switch (jumpability) {
      case 'excellent': return colors.brand.success;
      case 'good': return colors.brand.primary;
      case 'moderate': return colors.brand.warning;
      default: return colors.brand.danger;
    }
  };

  const getJumpabilityProgress = (jumpability: string) => {
    switch (jumpability) {
      case 'excellent': return 1;
      case 'good': return 0.75;
      case 'moderate': return 0.5;
      default: return 0.25;
    }
  };

  const getWeatherIcon = (condition: string): 'cloud-rain' | 'cloud' | 'wind' | 'sun' => {
    const lower = (condition || '').toLowerCase();
    if (lower.includes('rain') || lower.includes('storm')) return 'cloud-rain';
    if (lower.includes('cloud')) return 'cloud';
    if (lower.includes('wind')) return 'wind';
    return 'sun';
  };

  return (
    <SLCard padding="md" shadow="sm" style={{ marginBottom: spacing[6] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <SLIcon name={getWeatherIcon(weather.condition)} size="2xl" color={colors.brand.primary} />
          <View>
            <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.sky[600] }}>
              {weather.temperature}°C
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'capitalize' }}>
              {weather.condition}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <View>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[0.5] }}>
            WIND
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <SLIcon name="wind" size="xs" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {weather.windSpeed} km/h {weather.windDirection}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing[0.5] }}>
            JUMPABILITY
          </Text>
          <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary, textTransform: 'capitalize' }}>
            {weather.jumpability}
          </Text>
        </View>
      </View>

      <SLProgressBar
        progress={getJumpabilityProgress(weather.jumpability)}
        color={getJumpabilityColor(weather.jumpability)}
      />
    </SLCard>
  );
}
