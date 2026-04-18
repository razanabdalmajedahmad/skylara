import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import SLIcon, { type IconName } from './SLIcon';

interface SLInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
  onIconRightPress?: () => void;
  isPassword?: boolean;
}

const SLInput = forwardRef<TextInput, SLInputProps>(
  (
    {
      label,
      error,
      helperText,
      iconLeft,
      iconRight,
      onIconRightPress,
      isPassword = false,
      editable = true,
      ...textInputProps
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const hasError = !!error;
    const borderColor = hasError
      ? colors.brand.danger
      : focused
        ? colors.borderFocus
        : colors.border;

    return (
      <View style={{ gap: spacing[1] }}>
        {label && (
          <Text
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: hasError ? colors.brand.danger : colors.text.secondary,
              marginBottom: spacing[0.5],
            }}
          >
            {label}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor,
            borderRadius: radii.lg,
            backgroundColor: editable ? colors.background : colors.surface,
            paddingHorizontal: spacing[3],
            height: 48,
            gap: spacing[2],
          }}
        >
          {iconLeft && (
            <SLIcon
              name={iconLeft}
              size="sm"
              color={hasError ? colors.brand.danger : colors.text.tertiary}
            />
          )}

          <TextInput
            ref={ref}
            {...textInputProps}
            editable={editable}
            secureTextEntry={isPassword && !showPassword}
            onFocus={(e) => {
              setFocused(true);
              textInputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              textInputProps.onBlur?.(e);
            }}
            placeholderTextColor={colors.text.tertiary}
            style={{
              flex: 1,
              fontSize: typography.fontSize.base,
              color: colors.text.primary,
              height: '100%',
              padding: 0,
            }}
          />

          {isPassword && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <SLIcon
                name={showPassword ? 'eye-off' : 'eye'}
                size="sm"
                color={colors.text.tertiary}
              />
            </Pressable>
          )}

          {!isPassword && iconRight && (
            <Pressable
              onPress={onIconRightPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={!onIconRightPress}
            >
              <SLIcon
                name={iconRight}
                size="sm"
                color={hasError ? colors.brand.danger : colors.text.tertiary}
              />
            </Pressable>
          )}
        </View>

        {(error || helperText) && (
          <Text
            style={{
              fontSize: typography.fontSize.xs,
              color: hasError ? colors.brand.danger : colors.text.tertiary,
              marginTop: spacing[0.5],
            }}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

SLInput.displayName = 'SLInput';
export default SLInput;
