import React, { type ReactNode } from 'react';
import { View, Text, Pressable, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, hitSlop } from '@/theme';
import SLIcon from './SLIcon';

interface SLBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max height as fraction of screen (0–1). Default 0.7 */
  maxHeightFraction?: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SLBottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightFraction = 0.7,
}: SLBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        {/* Sheet */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
            maxHeight: SCREEN_HEIGHT * maxHeightFraction,
            paddingBottom: Math.max(insets.bottom, spacing[4]),
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: spacing[2] }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.gray[300],
              }}
            />
          </View>

          {/* Header */}
          {title && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing[6],
                paddingTop: spacing[4],
                paddingBottom: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                }}
              >
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={hitSlop.md}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.full,
                  backgroundColor: colors.gray[100],
                })}
              >
                <SLIcon name="x" size="sm" color={colors.text.secondary} />
              </Pressable>
            </View>
          )}

          {/* Content */}
          <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[4] }}>
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
