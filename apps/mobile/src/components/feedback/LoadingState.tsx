import React from 'react';
import { View, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'CONNECTING TO FREQUENCY...',
  subMessage,
  style,
}) => {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        },
        style,
      ]}
    >
      <View
        style={{
          padding: spacing.md,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.full,
          marginBottom: spacing.md,
          borderColor: colors.borderStrong,
          borderWidth: 1,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.wide,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      {subMessage && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            marginTop: spacing.xs,
            textAlign: 'center',
          }}
        >
          {subMessage}
        </Text>
      )}
    </View>
  );
};
