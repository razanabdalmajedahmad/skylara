import React from 'react';
import { View, Text, Image } from 'react-native';
import { colors, typography } from '@/theme';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SLAvatarProps {
  uri?: string | null;
  firstName?: string;
  lastName?: string;
  size?: Size;
  showOnline?: boolean;
  isOnline?: boolean;
}

const sizeMap: Record<Size, { container: number; text: number; badge: number }> = {
  xs: { container: 28, text: 11, badge: 8 },
  sm: { container: 36, text: 13, badge: 10 },
  md: { container: 44, text: 15, badge: 12 },
  lg: { container: 56, text: 20, badge: 14 },
  xl: { container: 72, text: 24, badge: 16 },
};

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

function getColorFromName(firstName?: string, lastName?: string): string {
  const name = (firstName || '') + (lastName || '');
  if (!name) return colors.gray[400];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palette = [
    colors.brand.primary,
    colors.brand.secondary,
    colors.brand.accent,
    '#EC4899', // Pink-500
    '#F97316', // Orange-500
    '#8B5CF6', // Violet-500
    '#06B6D4', // Cyan-500
    '#84CC16', // Lime-500
  ];

  return palette[Math.abs(hash) % palette.length];
}

export default function SLAvatar({
  uri,
  firstName,
  lastName,
  size = 'md',
  showOnline = false,
  isOnline = false,
}: SLAvatarProps) {
  const s = sizeMap[size];
  const bgColor = getColorFromName(firstName, lastName);

  return (
    <View style={{ position: 'relative', width: s.container, height: s.container }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: s.container,
            height: s.container,
            borderRadius: s.container / 2,
          }}
        />
      ) : (
        <View
          style={{
            width: s.container,
            height: s.container,
            borderRadius: s.container / 2,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.text.inverse,
              fontSize: s.text,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {getInitials(firstName, lastName)}
          </Text>
        </View>
      )}

      {showOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: s.badge,
            height: s.badge,
            borderRadius: s.badge / 2,
            backgroundColor: isOnline ? colors.brand.success : colors.gray[400],
            borderWidth: 2,
            borderColor: colors.background,
          }}
        />
      )}
    </View>
  );
}
