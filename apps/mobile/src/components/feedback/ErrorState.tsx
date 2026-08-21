import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from '../common/Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'TRANSMISSION ERROR',
  message,
  onRetry,
  retryLabel = 'RETRY CONNECTION',
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
          backgroundColor: colors.crimsonMuted,
          borderRadius: radii.lg,
          borderColor: colors.crimson,
          borderWidth: 1.5,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.crimson,
          marginBottom: spacing.sm,
        }}
      />
      <Text
        style={{
          color: colors.crimson,
          fontSize: typography.fontSize.sm,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.tactical,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          textAlign: 'center',
          marginTop: spacing.xs,
          lineHeight: typography.lineHeight.base,
        }}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          label={retryLabel}
          variant="tactical"
          size="sm"
          onPress={onRetry}
          style={{ marginTop: spacing.md }}
        />
      )}
    </View>
  );
};
