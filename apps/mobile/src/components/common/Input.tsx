import React from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  showClearButton?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onClear,
  showClearButton = false,
  containerStyle,
  style,
  value,
  ...rest
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const hasError = !!error;

  return (
    <View style={[{ marginBottom: spacing.md, width: '100%' }, containerStyle]}>
      {label && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
            fontWeight: '700',
            marginBottom: spacing.xxs,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceSubtle,
          borderColor: hasError ? colors.crimson : colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          minHeight: 48,
        }}
      >
        {leftIcon && <View style={{ marginRight: spacing.xs }}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={colors.textDisabled}
          value={value}
          style={[
            {
              flex: 1,
              color: colors.textPrimary,
              fontSize: typography.fontSize.base,
              paddingVertical: spacing.xs,
            },
            style,
          ]}
          {...rest}
        />
        {showClearButton && value && value.length > 0 && onClear && (
          <TouchableOpacity
            onPress={onClear}
            style={{ padding: spacing.xxs }}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
        {rightIcon && <View style={{ marginLeft: spacing.xs }}>{rightIcon}</View>}
      </View>
      {hasError ? (
        <Text
          style={{
            color: colors.crimson,
            fontSize: typography.fontSize.xs,
            marginTop: spacing.xxs,
            fontWeight: '600',
          }}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            marginTop: spacing.xxs,
          }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};
