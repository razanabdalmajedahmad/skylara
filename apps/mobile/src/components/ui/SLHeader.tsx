import React, { type ReactNode } from 'react';
import { View, Text, Pressable, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, hitSlop } from '@/theme';
import SLIcon, { type IconName } from './SLIcon';

interface SLHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightElement?: ReactNode;
  transparent?: boolean;
}

export default function SLHeader({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightIcon,
  onRightPress,
  rightElement,
  transparent = false,
}: SLHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const statusBarHeight = Platform.OS === 'android'
    ? StatusBar.currentHeight || 0
    : 0;
  const topPadding = Math.max(insets.top, statusBarHeight);

  return (
    <View
      style={{
        paddingTop: topPadding + spacing[2],
        paddingBottom: spacing[3],
        paddingHorizontal: spacing[4],
        backgroundColor: transparent ? 'transparent' : colors.background,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
        }}
      >
        {/* Left: back button or spacer */}
        <View style={{ width: 44, alignItems: 'flex-start' }}>
          {showBack && (
            <Pressable
              onPress={handleBack}
              hitSlop={hitSlop.md}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
            </Pressable>
          )}
        </View>

        {/* Center: title */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right: icon or element */}
        <View style={{ width: 44, alignItems: 'flex-end' }}>
          {rightElement || (
            rightIcon && onRightPress ? (
              <Pressable
                onPress={onRightPress}
                hitSlop={hitSlop.md}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <SLIcon name={rightIcon} size="lg" color={colors.text.primary} />
              </Pressable>
            ) : null
          )}
        </View>
      </View>
    </View>
  );
}
