import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { PRESET_FREQUENCIES } from '@aadan-pradan/config';
import { hapticFeedback } from '../../utils/haptics';

export interface FrequencyTunerProps {
  currentFrequency: string;
  onSelectFrequency: (frequency: string) => void;
}

export const FrequencyTuner: React.FC<FrequencyTunerProps> = ({
  currentFrequency,
  onSelectFrequency,
}) => {
  const { colors, typography, spacing, radii } = useTheme();

  const handleSelect = (freq: string) => {
    hapticFeedback.light();
    onSelectFrequency(freq);
  };

  return (
    <View style={{ marginVertical: spacing.xs }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSize.xxs,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.tactical,
          marginBottom: spacing.xxs,
          paddingHorizontal: spacing.xxs,
        }}
      >
        PRESET CHANNELS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.xxs }}
      >
        {PRESET_FREQUENCIES.map((freq) => {
          const isSelected = currentFrequency === freq;
          return (
            <TouchableOpacity
              key={freq}
              onPress={() => handleSelect(freq)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceElevated,
                borderColor: isSelected ? colors.primary : colors.border,
                borderWidth: isSelected ? 1.5 : 1,
                paddingVertical: 6,
                paddingHorizontal: spacing.sm,
                borderRadius: radii.md,
                gap: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Tune preset ${freq} MHz`}
            >
              <Text
                style={{
                  color: isSelected ? colors.primary : colors.textSecondary,
                  fontSize: typography.fontSize.xs,
                  fontWeight: '800',
                  fontFamily: typography.fontFamily.mono,
                }}
              >
                {freq}
              </Text>
              {isSelected && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
