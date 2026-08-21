import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from '../common/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          backgroundColor: colors.surfaceSubtle,
          borderRadius: radii.lg,
          borderColor: colors.border,
          borderWidth: 1,
          borderStyle: 'dashed',
        },
        style,
      ]}
    >
      {icon && <View style={{ marginBottom: spacing.md }}>{icon}</View>}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.wide,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
          textAlign: 'center',
          marginTop: spacing.xs,
          lineHeight: typography.lineHeight.base,
        }}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          variant="tactical"
          size="sm"
          onPress={onAction}
          style={{ marginTop: spacing.md }}
        />
      )}
    </View>
  );
};
