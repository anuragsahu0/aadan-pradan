import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Badge } from './Badge';
import { APP_NAME } from '@aadan-pradan/config';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBrand?: boolean;
  statusBadge?: string;
  statusVariant?: 'cyan' | 'amber' | 'emerald' | 'crimson' | 'neutral';
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBrand = true,
  statusBadge,
  statusVariant = 'cyan',
  rightElement,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        {showBrand && (
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '900',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: 2,
            }}
          >
            {APP_NAME.toUpperCase()}
          </Text>
        )}
        {title && (
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSize.xl,
              fontWeight: '900',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {statusBadge && <Badge label={statusBadge} variant={statusVariant} dot />}
        {rightElement}
      </View>
    </View>
  );
};
