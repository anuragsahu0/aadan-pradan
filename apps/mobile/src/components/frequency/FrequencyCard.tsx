import React from 'react';
import { View, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { hapticFeedback } from '../../utils/haptics';

export interface FrequencyCardProps {
  code: string;
  name: string;
  description?: string;
  userCount?: number;
  maxUsers?: number;
  lastActive?: string;
  isSelected?: boolean;
  onTune: (code: string) => void;
  style?: ViewStyle;
}

export const FrequencyCard: React.FC<FrequencyCardProps> = ({
  code,
  name,
  description,
  userCount = 0,
  maxUsers = 40,
  lastActive,
  isSelected = false,
  onTune,
  style,
}) => {
  const { colors, typography, spacing, radii, shadows } = useTheme();

  const handleTune = () => {
    hapticFeedback.light();
    onTune(code);
  };

  return (
    <View
      style={[
        {
          backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 1.5 : 1,
          borderRadius: radii.lg,
          padding: spacing.md,
          ...shadows.sm,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            style={{
              color: colors.lcdText,
              fontSize: typography.fontSize.lg,
              fontWeight: '900',
              fontFamily: typography.fontFamily.mono,
            }}
          >
            {code}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
              fontWeight: '700',
            }}
          >
            MHz
          </Text>
        </View>

        {isSelected ? (
          <Badge label="TUNED" variant="cyan" dot pulse />
        ) : (
          <Badge label={`${userCount} / ${maxUsers} USERS`} variant="neutral" />
        )}
      </View>

      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSize.base,
          fontWeight: '700',
          marginTop: 2,
        }}
      >
        {name}
      </Text>

      {description && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            marginTop: 2,
            lineHeight: typography.lineHeight.sm,
          }}
        >
          {description}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.sm,
          paddingTop: spacing.xs,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xxs, fontWeight: '600' }}>
          {lastActive ? `● ${lastActive}` : 'Ready for connection'}
        </Text>

        <Button
          label={isSelected ? 'OPEN CHANNEL' : 'TUNE IN'}
          variant={isSelected ? 'tactical' : 'primary'}
          size="sm"
          onPress={handleTune}
        />
      </View>
    </View>
  );
};
