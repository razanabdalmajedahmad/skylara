import React, { useEffect, useRef } from 'react';
import { View, Animated, type ViewStyle } from 'react-native';
import { colors, radii, durations } from '@/theme';

interface SLSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SLSkeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  style,
}: SLSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: durations.slow * 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: durations.slow * 2,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Preset Skeletons ────────────────────────────────────────────────────────

export function SLSkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <SLSkeleton height={height} borderRadius={radii.lg} />
    </View>
  );
}

export function SLSkeletonRow() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
      <SLSkeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 8 }}>
        <SLSkeleton height={14} width="60%" />
        <SLSkeleton height={12} width="40%" />
      </View>
    </View>
  );
}

export function SLSkeletonStats() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
      <View style={{ flex: 1 }}>
        <SLSkeleton height={80} borderRadius={radii.lg} />
      </View>
      <View style={{ flex: 1 }}>
        <SLSkeleton height={80} borderRadius={radii.lg} />
      </View>
    </View>
  );
}
