import React, { type ReactNode } from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '@/theme';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Shadow = 'none' | 'sm' | 'md' | 'lg';

interface SLCardProps {
  children: ReactNode;
  padding?: Padding;
  shadow?: Shadow;
  bordered?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const paddingMap: Record<Padding, number> = {
  none: 0,
  sm: spacing[3],
  md: spacing[4],
  lg: spacing[6],
};

export default function SLCard({
  children,
  padding = 'md',
  shadow = 'sm',
  bordered = true,
  onPress,
  style,
}: SLCardProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: paddingMap[padding],
    ...(bordered
      ? { borderWidth: 1, borderColor: colors.border }
      : {}),
    ...shadows[shadow],
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          ...baseStyle,
          opacity: pressed ? 0.95 : 1,
        })}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}
