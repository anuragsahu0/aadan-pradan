import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export type BadgeVariant = 'cyan' | 'amber' | 'emerald' | 'crimson' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'cyan',
  dot = false,
  pulse = false,
  style,
}) => {
  const { colors, typography, spacing, radii } = useTheme();

  const getBadgeColors = () => {
    switch (variant) {
      case 'emerald':
        return { bg: colors.emeraldMuted, text: colors.emerald, dot: colors.emerald };
      case 'amber':
        return { bg: colors.amberMuted, text: colors.amber, dot: colors.amber };
      case 'crimson':
        return { bg: colors.crimsonMuted, text: colors.crimson, dot: colors.crimson };
      case 'neutral':
        return { bg: colors.surfaceElevated, text: colors.textSecondary, dot: colors.textSecondary };
      case 'cyan':
      default:
        return { bg: colors.primaryMuted, text: colors.primary, dot: colors.primary };
    }
  };

  const scheme = getBadgeColors();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingHorizontal: spacing.xs,
          borderRadius: radii.full,
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: scheme.bg,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: scheme.dot,
          }}
        />
      )}
      <Text
        style={{
          color: scheme.text,
          fontSize: typography.fontSize.xxs,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.wide,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
};
