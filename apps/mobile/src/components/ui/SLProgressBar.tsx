import React from 'react';
import { View, Text } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

interface SLProgressBarProps {
  /** 0–1 fraction */
  progress?: number;
  /** 0–100 percent (convenience; maps to progress when set) */
  value?: number;
  /** Optional label above the bar */
  label?: string;
  /** Optional value text on right (e.g. "7/14") */
  valueText?: string;
  /** Bar color — defaults to brand primary */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Bar height */
  height?: number;
}

export default function SLProgressBar({
  progress = 0,
  value,
  label,
  valueText,
  color = colors.brand.primary,
  trackColor = colors.gray[200],
  height = 6,
}: SLProgressBarProps) {
  const fraction =
    value !== undefined
      ? Math.min(Math.max(value / 100, 0), 1)
      : Math.min(Math.max(progress, 0), 1);
  const clampedProgress = fraction;

  return (
    <View>
      {(label || valueText) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[1],
          }}
        >
          {label && (
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.secondary,
              }}
            >
              {label}
            </Text>
          )}
          {valueText && (
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}
            >
              {valueText}
            </Text>
          )}
        </View>
      )}

      <View
        style={{
          height,
          backgroundColor: trackColor,
          borderRadius: radii.full,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${clampedProgress * 100}%`,
            backgroundColor: color,
            borderRadius: radii.full,
          }}
        />
      </View>
    </View>
  );
}
