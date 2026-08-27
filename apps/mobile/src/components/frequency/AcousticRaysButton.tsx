import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '../../theme';
import type { PttButtonState, PttSpeakerInfo } from '@aadan-pradan/types';

export interface AcousticRaysButtonProps {
  status: PttButtonState;
  speaker?: PttSpeakerInfo | null;
  remainingSeconds?: number;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

const TOTAL_TICKS = 48;

export const AcousticRaysButton: React.FC<AcousticRaysButtonProps> = ({
  status,
  speaker,
  remainingSeconds = 30,
  disabled = false,
  onPressIn,
  onPressOut,
}) => {
  const { colors, radii } = useTheme();

  const isTalking = status === 'talking';
  const isRequesting = status === 'requesting';
  const isBusy = status === 'busy';
  const isError = status === 'error';
  const isDisabled = disabled || isBusy;

  // Pulse animation for radiating audio ticks
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTalking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTalking]);

  // Generate 48 acoustic ray ticks around 360 degrees
  // Soundwave burst pattern: longer rays on left (270°) and right (90°)
  const ticks = React.useMemo(() => {
    return Array.from({ length: TOTAL_TICKS }).map((_, i) => {
      const angle = (i * 360) / TOTAL_TICKS;
      const rad = (angle * Math.PI) / 180;
      // Audio waveform modulation
      const mod = Math.abs(Math.sin(rad * 2));
      const tickHeight = 6 + mod * 18;
      const opacity = 0.4 + mod * 0.6;
      return { angle, tickHeight, opacity };
    });
  }, []);

  const activeColor = isTalking ? '#22C55E' : isBusy ? '#FFA000' : '#FF7A00';

  return (
    <View style={styles.container}>
      {/* Outer Radiating Acoustic Soundwave Rays */}
      <View style={styles.raysContainer}>
        {ticks.map((t, idx) => (
          <View
            key={idx}
            style={[
              styles.tickRay,
              {
                transform: [
                  { rotate: `${t.angle}deg` },
                  { translateY: -128 },
                ],
                height: isTalking ? t.tickHeight * 1.3 : t.tickHeight,
                backgroundColor: activeColor,
                opacity: isTalking ? 0.9 : t.opacity,
              },
            ]}
          />
        ))}
      </View>

      {/* Outer Dotted Ambient Glow Ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: activeColor + '40',
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main Interactive Button (Strict Push-and-Hold Walkie-Talkie) */}
      <Pressable
        accessibilityRole={'button' as AccessibilityRole}
        accessibilityLabel={
          isTalking ? 'Transmitting audio. Release to mute.' : 'Hold to talk'
        }
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        {...({
          onTouchEnd: onPressOut,
          onTouchCancel: onPressOut,
          onMouseUp: onPressOut,
          onMouseLeave: onPressOut,
          onContextMenu: (e: any) => {
            e.preventDefault?.();
            return false;
          },
        } as any)}
        style={({ pressed }) => [
          styles.mainButton,
          {
            borderColor: activeColor,
            shadowColor: activeColor,
            transform: [{ scale: (pressed || isTalking) && !isDisabled ? 0.95 : 1 }],
          },
        ]}
      >
        {/* Inner Dark Surface with Radial Gradient Feel */}
        <View style={styles.innerSurface}>
          {isRequesting ? (
            <View style={styles.centerCol}>
              <ActivityIndicator color="#FF7A00" size="large" />
              <Text style={[styles.statusSubtext, { color: '#FF7A00', marginTop: 8 }]}>
                CONNECTING...
              </Text>
            </View>
          ) : isTalking ? (
            <View style={styles.centerCol}>
              <Text style={{ fontSize: 40 }}>🎙️</Text>
              <Text style={[styles.mainLabel, { color: '#22C55E' }]}>LIVE</Text>
              <Text style={[styles.statusSubtext, { color: '#22C55E', fontSize: 11, marginTop: 4, fontWeight: '700' }]}>
                RELEASE TO MUTE
              </Text>
            </View>
          ) : isBusy ? (
            <View style={styles.centerCol}>
              <Text style={{ fontSize: 32 }}>🔒</Text>
              <Text style={[styles.mainLabel, { color: '#FFA000' }]}>CHANNEL BUSY</Text>
              <Text style={styles.statusSubtext}>
                {speaker?.displayName || 'Operator'} is talking
              </Text>
            </View>
          ) : (
            <View style={styles.centerCol}>
              {/* Sleek SVG-style Microphone */}
              <View style={styles.micIconCircle}>
                <Text style={styles.micEmoji}>🎙️</Text>
              </View>
              <Text style={styles.holdToTalkText}>Hold to Talk</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 290,
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  raysContainer: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickRay: {
    position: 'absolute',
    width: 2.5,
    borderRadius: 1.5,
  },
  glowRing: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  mainButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3.5,
    backgroundColor: '#121620',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 12,
    userSelect: 'none',
    touchAction: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  } as any,
  innerSurface: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: '#161C26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  micIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micEmoji: {
    fontSize: 30,
  },
  holdToTalkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#22C55E',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  statusSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
