import React from 'react';
import { View, Text } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

type Variant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'default'
  | 'error';
type Size = 'sm' | 'md';

interface SLBadgeProps {
  label: string;
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#DCFCE7', text: '#15803D' },  // Green-100 / Green-700
  warning: { bg: '#FEF3C7', text: '#A16207' },  // Amber-100 / Amber-700
  danger: { bg: '#FEE2E2', text: '#B91C1C' },   // Red-100 / Red-700
  info: { bg: '#DBEAFE', text: '#1D4ED8' },      // Blue-100 / Blue-700
  neutral: { bg: colors.gray[100], text: colors.gray[700] },
  primary: { bg: colors.sky[100], text: colors.sky[700] },
  secondary: { bg: '#EDE9FE', text: '#6D28D9' }, // Violet-100 / Violet-700
  default: { bg: colors.gray[100], text: colors.gray[700] },
  error: { bg: '#FEE2E2', text: '#B91C1C' },
};

export default function SLBadge({
  label,
  variant = 'neutral',
  size = 'sm',
}: SLBadgeProps) {
  const v = variantStyles[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={{
        backgroundColor: v.bg,
        paddingHorizontal: isSmall ? spacing[2] : spacing[3],
        paddingVertical: isSmall ? spacing[0.5] : spacing[1],
        borderRadius: radii.full,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: v.text,
          fontSize: isSmall ? typography.fontSize.xs : typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
