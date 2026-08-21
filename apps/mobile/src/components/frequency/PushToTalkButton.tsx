import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '../../theme';
import type { PttButtonState, PttSpeakerInfo } from '@aadan-pradan/types';

export interface PushToTalkButtonProps {
  status: PttButtonState;
  speaker?: PttSpeakerInfo | null;
  remainingSeconds?: number;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  status,
  speaker,
  remainingSeconds = 30,
  disabled = false,
  onPressIn,
  onPressOut,
}) => {
  const { colors, typography, radii, spacing } = useTheme();

  const isTalking = status === 'talking';
  const isRequesting = status === 'requesting';
  const isBusy = status === 'busy';
  const isError = status === 'error';
  const isDisabled = disabled || isBusy;

  // Derive visual theme colors based on state
  const getButtonBgColor = () => {
    if (isDisabled && isBusy) return colors.surfaceElevated;
    if (isDisabled) return colors.surfaceSubtle;
    if (isTalking) return colors.crimson;
    if (isRequesting) return colors.amber;
    if (isError) return colors.crimsonMuted;
    return colors.primary;
  };

  const getBorderColor = () => {
    if (isTalking) return '#FF4D4D';
    if (isRequesting) return colors.amber;
    if (isBusy) return colors.border;
    if (isDisabled) return colors.border;
    return colors.primaryMuted;
  };

  const getShadowColor = () => {
    if (isTalking) return colors.crimson;
    if (isRequesting) return colors.amber;
    return colors.primary;
  };

  const formatRemainingTime = (sec: number) => {
    const s = Math.max(0, sec);
    return `00:${s.toString().padStart(2, '0')}`;
  };

  const getAccessibilityLabel = () => {
    if (isTalking) return `Currently transmitting. ${remainingSeconds} seconds remaining. Release to stop.`;
    if (isRequesting) return 'Requesting transmission floor';
    if (isBusy) return `Channel busy. ${speaker?.displayName || 'Another operator'} is currently transmitting.`;
    if (isDisabled) return 'Push to talk unavailable';
    return 'Hold to talk';
  };

  return (
    <View style={styles.outerContainer}>
      <Pressable
        accessibilityRole={'button' as AccessibilityRole}
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityState={{ disabled: isDisabled, busy: isRequesting }}
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: getButtonBgColor(),
            borderColor: getBorderColor(),
            shadowColor: getShadowColor(),
            borderRadius: radii.full,
            opacity: isDisabled && !isBusy ? 0.5 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
            userSelect: 'none',
          } as any,
        ]}
      >
        {/* Outer Glow Ring */}
        <View
          style={[
            styles.innerRing,
            {
              borderColor: isTalking ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.15)',
              borderRadius: radii.full,
            },
          ]}
        >
          {isRequesting ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color="#000000" size="small" />
              <Text style={[styles.mainLabel, { color: '#000000', marginTop: 6 }]}>
                REQUESTING...
              </Text>
            </View>
          ) : isTalking ? (
            <View style={styles.centerContent}>
              <View style={styles.transmittingIndicator}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveTag}>LIVE</Text>
              </View>
              <Text style={styles.talkingLabel}>TRANSMITTING</Text>
              <Text style={styles.countdownLabel}>
                {formatRemainingTime(remainingSeconds)}
              </Text>
            </View>
          ) : isBusy ? (
            <View style={styles.centerContent}>
              <Text style={{ fontSize: 24 }}>🔒</Text>
              <Text style={[styles.busyLabel, { color: colors.amber }]}>CHANNEL BUSY</Text>
              <Text style={[styles.subText, { color: colors.textMuted }]}>
                {speaker?.displayName || 'Operator'} talking
              </Text>
            </View>
          ) : isError ? (
            <View style={styles.centerContent}>
              <Text style={{ fontSize: 22 }}>⚠️</Text>
              <Text style={[styles.mainLabel, { color: colors.crimson }]}>TRY AGAIN</Text>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.micIcon}>🎙️</Text>
              <Text style={styles.idleLabel}>HOLD TO TALK</Text>
              <Text style={styles.subText}>PRESS & HOLD</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Accessible instruction tag */}
      <Text style={[styles.helpText, { color: colors.textMuted }]}>
        {isTalking
          ? 'Release button to end transmission'
          : isBusy
          ? 'Wait for current operator to finish'
          : 'Press and hold button to transmit audio'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 8,
  },
  button: {
    width: 200,
    height: 200,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  innerRing: {
    width: 176,
    height: 176,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 34,
    marginBottom: 4,
  },
  idleLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  subText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0, 0, 0, 0.6)',
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  talkingLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    marginTop: 2,
  },
  transmittingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  mainLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  busyLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
