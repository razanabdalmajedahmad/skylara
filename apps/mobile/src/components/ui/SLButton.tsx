import React from 'react';
import { Pressable, Text, ActivityIndicator, Platform } from 'react-native';
import { colors, radii, typography, spacing } from '@/theme';
import SLIcon, { type IconName } from './SLIcon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface SLButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, {
  bg: string;
  bgPressed: string;
  text: string;
  border: string;
  loaderColor: string;
}> = {
  primary: {
    bg: colors.brand.primary,
    bgPressed: colors.sky[600],
    text: colors.text.inverse,
    border: 'transparent',
    loaderColor: '#FFFFFF',
  },
  secondary: {
    bg: colors.brand.secondary,
    bgPressed: '#4F46E5', // Indigo-600
    text: colors.text.inverse,
    border: 'transparent',
    loaderColor: '#FFFFFF',
  },
  danger: {
    bg: colors.brand.danger,
    bgPressed: '#DC2626', // Red-600
    text: colors.text.inverse,
    border: 'transparent',
    loaderColor: '#FFFFFF',
  },
  ghost: {
    bg: 'transparent',
    bgPressed: colors.gray[100],
    text: colors.text.primary,
    border: 'transparent',
    loaderColor: colors.brand.primary,
  },
  outline: {
    bg: 'transparent',
    bgPressed: colors.sky[50],
    text: colors.brand.primary,
    border: colors.brand.primary,
    loaderColor: colors.brand.primary,
  },
};

const sizeStyles: Record<Size, {
  height: number;
  paddingH: number;
  fontSize: number;
  iconSize: number;
  borderRadius: number;
}> = {
  sm: {
    height: 36,
    paddingH: spacing[3],
    fontSize: typography.fontSize.sm,
    iconSize: 14,
    borderRadius: radii.md,
  },
  md: {
    height: 44,
    paddingH: spacing[4],
    fontSize: typography.fontSize.base,
    iconSize: 18,
    borderRadius: radii.lg,
  },
  lg: {
    height: 52,
    paddingH: spacing[5],
    fontSize: typography.fontSize.lg,
    iconSize: 20,
    borderRadius: radii.lg,
  },
};

export default function SLButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
}: SLButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const triggerHaptic = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = require('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable — no-op
    }
  };

  const handlePress = () => {
    if (isDisabled) return;
    triggerHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: s.height,
        paddingHorizontal: s.paddingH,
        backgroundColor: pressed ? v.bgPressed : v.bg,
        borderRadius: s.borderRadius,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: v.border,
        opacity: isDisabled ? 0.5 : 1,
        gap: spacing[2],
        ...(fullWidth ? { width: '100%' } : {}),
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.loaderColor} />
      ) : (
        <>
          {iconLeft && (
            <SLIcon name={iconLeft} size="sm" color={v.text} />
          )}
          <Text
            style={{
              color: v.text,
              fontSize: s.fontSize,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            {label}
          </Text>
          {iconRight && (
            <SLIcon name={iconRight} size="sm" color={v.text} />
          )}
        </>
      )}
    </Pressable>
  );
}
