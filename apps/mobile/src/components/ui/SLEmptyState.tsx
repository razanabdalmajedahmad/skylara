import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import SLIcon, { type IconName } from './SLIcon';
import SLButton from './SLButton';

interface SLEmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SLEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: SLEmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing[10],
        paddingHorizontal: spacing[6],
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.sky[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[4],
        }}
      >
        <SLIcon name={icon} size="2xl" color={colors.brand.primary} />
      </View>

      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: spacing[1],
        }}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            textAlign: 'center',
            maxWidth: 280,
            lineHeight: typography.lineHeight.sm,
          }}
        >
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <View style={{ marginTop: spacing[5] }}>
          <SLButton label={actionLabel} onPress={onAction} variant="outline" size="sm" />
        </View>
      )}
    </View>
  );
}
