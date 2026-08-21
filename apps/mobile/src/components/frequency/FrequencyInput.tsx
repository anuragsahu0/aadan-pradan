import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from '../common/Button';
import { isValidFrequencyCode, normalizeFrequencyCode } from '@aadan-pradan/utils';
import { PRESET_FREQUENCIES } from '@aadan-pradan/config';
import { hapticFeedback } from '../../utils/haptics';

export interface FrequencyInputProps {
  initialValue?: string;
  onConnect: (frequencyCode: string) => Promise<void> | void;
  loading?: boolean;
}

export const FrequencyInput: React.FC<FrequencyInputProps> = ({
  initialValue = '145.800',
  onConnect,
  loading = false,
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (text: string) => {
    // Only allow digits and dots
    const filtered = text.replace(/[^\d.]/g, '');
    setValue(filtered);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleConnect = async () => {
    const normalized = normalizeFrequencyCode(value);
    if (!isValidFrequencyCode(normalized)) {
      hapticFeedback.error();
      setErrorMessage('Invalid format. Enter 3 digits, dot, 3 digits (e.g. 145.800)');
      return;
    }

    setErrorMessage(null);
    hapticFeedback.success();
    setValue(normalized);
    await onConnect(normalized);
  };

  const handleSelectPreset = (freq: string) => {
    hapticFeedback.light();
    setValue(freq);
    setErrorMessage(null);
  };

  const handleClear = () => {
    hapticFeedback.light();
    setValue('');
    setErrorMessage(null);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.borderStrong,
        borderWidth: 1.5,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            color: colors.primary,
            fontSize: typography.fontSize.xs,
            fontWeight: '800',
            letterSpacing: typography.letterSpacing.tactical,
          }}
        >
          CONNECT TO A FREQUENCY
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
          VIRTUAL IP CHANNEL
        </Text>
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs }}>
        Enter any virtual frequency index to join an instant audio group (Max 40 users).
      </Text>

      {/* Main Frequency Box */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceSubtle,
          borderColor: errorMessage ? colors.crimson : colors.border,
          borderWidth: 1.5,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          minHeight: 54,
        }}
      >
        <Text
          style={{
            color: colors.primary,
            fontSize: typography.fontSize.lg,
            fontWeight: '900',
            fontFamily: typography.fontFamily.mono,
            marginRight: spacing.xs,
          }}
        >
          📻
        </Text>

        <TextInput
          value={value}
          onChangeText={handleInputChange}
          placeholder="145.800"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          maxLength={7}
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontSize: typography.fontSize.xl,
            fontWeight: '900',
            fontFamily: typography.fontFamily.mono,
            letterSpacing: typography.letterSpacing.wide,
          }}
          accessibilityLabel="Frequency input"
        />

        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={{
              padding: spacing.xs,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.full,
              marginRight: spacing.xs,
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, fontWeight: '800' }}>
              ✕
            </Text>
          </TouchableOpacity>
        )}

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
            fontWeight: '800',
          }}
        >
          MHz
        </Text>
      </View>

      {errorMessage && (
        <Text
          style={{
            color: colors.crimson,
            fontSize: typography.fontSize.xs,
            fontWeight: '600',
          }}
        >
          {errorMessage}
        </Text>
      )}

      {/* Quick Preset Selector Chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
        {PRESET_FREQUENCIES.slice(0, 4).map((preset) => (
          <TouchableOpacity
            key={preset}
            onPress={() => handleSelectPreset(preset)}
            style={{
              backgroundColor: value === preset ? colors.primaryMuted : colors.surfaceElevated,
              borderColor: value === preset ? colors.primary : colors.border,
              borderWidth: 1,
              paddingVertical: 4,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.sm,
            }}
          >
            <Text
              style={{
                color: value === preset ? colors.primary : colors.textSecondary,
                fontSize: typography.fontSize.xs,
                fontWeight: '700',
                fontFamily: typography.fontFamily.mono,
              }}
            >
              {preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        label={loading ? 'TUNING CHANNEL...' : 'CONNECT'}
        variant="primary"
        size="lg"
        loading={loading}
        onPress={handleConnect}
        style={{ marginTop: spacing.xs }}
      />
    </View>
  );
};
