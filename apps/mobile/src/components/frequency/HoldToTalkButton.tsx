import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { hapticFeedback } from '../../utils/haptics';

export type PttState = 'idle' | 'pressed' | 'busy' | 'disabled';

export interface HoldToTalkButtonProps {
  state?: PttState;
  onTalkStart?: () => void;
  onTalkEnd?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const HoldToTalkButton: React.FC<HoldToTalkButtonProps> = ({
  state = 'idle',
  onTalkStart,
  onTalkEnd,
  disabled = false,
  style,
}) => {
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const [internalPressed, setInternalPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isBusy = state === 'busy';
  const isDisabled = disabled || state === 'disabled';
  const isTransmitting = (state === 'pressed' || internalPressed) && !isBusy && !isDisabled;

  const handlePressIn = () => {
    if (isDisabled || isBusy) {
      hapticFeedback.warning();
      return;
    }

    setInternalPressed(true);
    hapticFeedback.medium();

    Animated.spring(scaleAnim, {
      toValue: 0.93,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();

    onTalkStart?.();
  };

  const handlePressOut = () => {
    if (isDisabled || isBusy) return;

    setInternalPressed(false);
    hapticFeedback.light();

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();

    onTalkEnd?.();
  };

  const getButtonVisuals = () => {
    if (isDisabled) {
      return {
        icon: '🎙️',
        label: 'UNAVAILABLE',
        sublabel: 'DISCONNECTED',
        outerBorder: colors.border,
        coreBg: colors.surfaceSubtle,
        textColor: colors.textDisabled,
      };
    }

    if (isBusy) {
      return {
        icon: '🔒',
        label: 'FREQUENCY BUSY',
        sublabel: 'ANOTHER OPERATOR SPEAKING',
        outerBorder: colors.amber,
        coreBg: colors.amberMuted,
        textColor: colors.amber,
      };
    }

    if (isTransmitting) {
      return {
        icon: '🎙️',
        label: 'TRANSMITTING',
        sublabel: 'RELEASE TO STOP',
        outerBorder: colors.emerald,
        coreBg: '#082E1B',
        textColor: colors.emerald,
      };
    }

    return {
      icon: '🎙️',
      label: 'HOLD TO TALK',
      sublabel: 'PUSH TO TALK FLOOR',
      outerBorder: colors.borderStrong,
      coreBg: colors.surfaceElevated,
      textColor: colors.primary,
    };
  };

  const visuals = getButtonVisuals();

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: spacing.md }, style]}>
      {/* Outer Tactical Bezel */}
      <View
        style={{
          width: 224,
          height: 224,
          borderRadius: 112,
          backgroundColor: colors.surfaceSubtle,
          borderColor: visuals.outerBorder,
          borderWidth: 3,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.tacticalButton,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: scaleAnim }],
          }}
        >
          <Pressable
            disabled={isDisabled || isBusy}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{
              width: 198,
              height: 198,
              borderRadius: 99,
              backgroundColor: colors.surface,
              borderColor: isTransmitting ? colors.emerald : colors.border,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.sm,
            }}
            accessibilityRole="button"
            accessibilityLabel={visuals.label}
            accessibilityHint="Hold to transmit audio, release to listen"
            accessibilityState={{
              disabled: isDisabled,
              busy: isBusy,
              selected: isTransmitting,
            }}
          >
            {/* Inner Core */}
            <View
              style={{
                width: 172,
                height: 172,
                borderRadius: 86,
                backgroundColor: visuals.coreBg,
                borderColor: visuals.outerBorder,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 32 }}>{visuals.icon}</Text>

              <Text
                style={{
                  color: visuals.textColor,
                  fontSize: typography.fontSize.sm,
                  fontWeight: '900',
                  letterSpacing: typography.letterSpacing.tactical,
                  textAlign: 'center',
                }}
              >
                {visuals.label}
              </Text>

              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textAlign: 'center',
                }}
              >
                {visuals.sublabel}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {/* Visual Instruction Banner */}
      <View
        style={{
          marginTop: spacing.md,
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingVertical: spacing.xs,
        }}
      >
        <Text
          style={{
            color: isTransmitting ? colors.emerald : colors.amber,
            fontSize: typography.fontSize.xs,
            fontWeight: '700',
            letterSpacing: typography.letterSpacing.wide,
            textAlign: 'center',
          }}
        >
          {isTransmitting ? 'Transmitting Simulated Floor Control' : 'Push-to-Talk Architecture Ready'}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 10,
            marginTop: 2,
            textAlign: 'center',
          }}
        >
          Release to stop transmitting • Audio streaming in later phase
        </Text>
      </View>
    </View>
  );
};
