import React from 'react';
import { View, StyleSheet, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'tactical' | 'lcd' | 'interactive';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  style,
  ...rest
}) => {
  const { colors, radii, spacing, shadows } = useTheme();

  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderStrong,
          borderWidth: 1,
          ...shadows.md,
        };
      case 'tactical':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
          borderWidth: 1.5,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
          ...shadows.md,
        };
      case 'lcd':
        return {
          backgroundColor: colors.lcdBackground,
          borderColor: colors.lcdBorder,
          borderWidth: 1.5,
          borderRadius: radii.md,
        };
      case 'interactive':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          ...shadows.sm,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          ...shadows.sm,
        };
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: radii.lg,
          padding: spacing.md,
        },
        getCardStyle(),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
