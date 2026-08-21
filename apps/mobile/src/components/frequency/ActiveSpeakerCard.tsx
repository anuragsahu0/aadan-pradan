import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import type { UserSummary } from '@aadan-pradan/types';

export interface ActiveSpeakerCardProps {
  speaker: UserSummary | null;
  isTransmitting?: boolean;
}

export const ActiveSpeakerCard: React.FC<ActiveSpeakerCardProps> = ({
  speaker,
  isTransmitting = false,
}) => {
  const { colors, typography, spacing, radii, shadows } = useTheme();

  // Animated Waveform Bars
  const bar1 = useRef(new Animated.Value(6)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(10)).current;
  const bar4 = useRef(new Animated.Value(18)).current;
  const bar5 = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (speaker || isTransmitting) {
      const createAnimation = (val: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: max, duration, useNativeDriver: false }),
            Animated.timing(val, { toValue: min, duration, useNativeDriver: false }),
          ])
        );
      };

      const a1 = createAnimation(bar1, 4, 18, 300);
      const a2 = createAnimation(bar2, 6, 24, 250);
      const a3 = createAnimation(bar3, 4, 22, 280);
      const a4 = createAnimation(bar4, 8, 26, 320);
      const a5 = createAnimation(bar5, 4, 16, 270);

      a1.start();
      a2.start();
      a3.start();
      a4.start();
      a5.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        a4.stop();
        a5.stop();
      };
    }
  }, [speaker, isTransmitting, bar1, bar2, bar3, bar4, bar5]);

  return (
    <View
      style={{
        backgroundColor: speaker || isTransmitting ? colors.emeraldMuted : colors.surfaceSubtle,
        borderColor: speaker || isTransmitting ? colors.emerald : colors.border,
        borderWidth: 1.5,
        borderRadius: radii.lg,
        padding: spacing.md,
        ...shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text
          style={{
            color: speaker || isTransmitting ? colors.emerald : colors.textSecondary,
            fontSize: typography.fontSize.xxs,
            fontWeight: '800',
            letterSpacing: typography.letterSpacing.tactical,
          }}
        >
          ACTIVE SPEAKER
        </Text>

        {speaker || isTransmitting ? (
          <Badge label="TRANSMITTING" variant="emerald" dot pulse />
        ) : (
          <Badge label="FLOOR IDLE" variant="neutral" />
        )}
      </View>

      {speaker || isTransmitting ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <Avatar
              displayName={isTransmitting ? 'You' : speaker?.displayName || 'Speaker'}
              size={44}
              isSpeaker
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.md,
                  fontWeight: '800',
                }}
                numberOfLines={1}
              >
                {isTransmitting ? 'You (Alpha-01)' : speaker?.displayName}
              </Text>
              <Text style={{ color: colors.emerald, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                Speaking now...
              </Text>
            </View>
          </View>

          {/* Live Audio Wave Graphic */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.xs }}>
            {[bar1, bar2, bar3, bar4, bar5].map((b, i) => (
              <Animated.View
                key={i}
                style={{
                  width: 3.5,
                  height: b,
                  backgroundColor: colors.emerald,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 }}>
          <Text style={{ fontSize: 20 }}>📻</Text>
          <View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
              Channel is Clear
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xs }}>
              Hold PTT button below to start speaking
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
