import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { hapticFeedback } from '../../utils/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'tactical' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  enableHaptics?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  enableHaptics = true,
  disabled,
  onPress,
  style,
  ...rest
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const isDisabled = disabled || loading;

  const handlePress = (e: any) => {
    if (enableHaptics) {
      hapticFeedback.light();
    }
    onPress?.(e);
  };

  const getContainerStyle = (): ViewStyle => {
    const sizeStyle: ViewStyle = {
      sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 40 },
      md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 48 },
      lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 56 },
    }[size];

    const variantStyle: ViewStyle = {
      primary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      tactical: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.borderStrong,
        borderWidth: 1.5,
      },
      secondary: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.border,
        borderWidth: 1,
      },
      danger: {
        backgroundColor: colors.crimson,
        borderColor: colors.crimson,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
    }[variant];

    return {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      gap: spacing.xs,
      ...sizeStyle,
      ...variantStyle,
      ...(fullWidth ? { width: '100%' } : {}),
      ...(isDisabled ? { opacity: 0.45 } : {}),
      ...(style as ViewStyle),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeTextStyle: TextStyle = {
      sm: { fontSize: typography.fontSize.sm },
      md: { fontSize: typography.fontSize.base },
      lg: { fontSize: typography.fontSize.md },
    }[size];

    const variantTextStyle: TextStyle = {
      primary: { color: colors.textInverse, fontWeight: '700' as const },
      tactical: {
        color: colors.primary,
        fontWeight: '700' as const,
        letterSpacing: typography.letterSpacing.wide,
      },
      secondary: { color: colors.textPrimary, fontWeight: '600' as const },
      danger: { color: colors.textInverse, fontWeight: '700' as const },
      ghost: { color: colors.primary, fontWeight: '600' as const },
    }[variant];

    return {
      textAlign: 'center',
      ...sizeTextStyle,
      ...variantTextStyle,
      ...(isDisabled ? { color: colors.textDisabled } : {}),
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      onPress={handlePress}
      style={getContainerStyle()}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.primary}
        />
      ) : (
        <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text style={getTextStyle()}>{label}</Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
};
