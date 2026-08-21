import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { normalizeFrequencyCode } from '@aadan-pradan/utils';
import type { FrequencyConnectionStatus } from '../../store/frequencyStore';

export interface FrequencyDisplayProps {
  frequencyCode: string;
  channelName?: string | null;
  status?: FrequencyConnectionStatus;
  userCount?: number;
  maxUsers?: number;
  isTransmitting?: boolean;
  style?: ViewStyle;
}

export const FrequencyDisplay: React.FC<FrequencyDisplayProps> = ({
  frequencyCode,
  channelName = 'PRIMARY CALLING',
  status = 'CONNECTED',
  userCount = 0,
  maxUsers = 40,
  isTransmitting = false,
  style,
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const normalized = normalizeFrequencyCode(frequencyCode);

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTING':
        return { label: 'CONNECTING...', color: colors.amber, bg: colors.amberMuted };
      case 'FULL':
        return { label: 'CHANNEL FULL', color: colors.crimson, bg: colors.crimsonMuted };
      case 'BUSY':
        return { label: 'TRANSMITTING LOCK', color: colors.amber, bg: colors.amberMuted };
      case 'ERROR':
      case 'DISCONNECTED':
        return { label: 'DISCONNECTED', color: colors.crimson, bg: colors.crimsonMuted };
      case 'CONNECTED':
      default:
        return isTransmitting
          ? { label: 'LIVE TRANSMISSION', color: colors.emerald, bg: colors.emeraldMuted }
          : { label: 'CONNECTED', color: colors.emerald, bg: colors.emeraldMuted };
    }
  };

  const badgeInfo = getStatusBadge();

  return (
    <View
      style={[
        {
          backgroundColor: colors.lcdBackground,
          borderColor: isTransmitting ? colors.emerald : colors.lcdBorder,
          borderWidth: 2,
          borderRadius: radii.lg,
          padding: spacing.md,
          position: 'relative',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Top Header of LCD */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: badgeInfo.color,
            }}
          />
          <Text
            style={{
              color: colors.lcdTextDim,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
            }}
          >
            VIRTUAL FREQUENCY
          </Text>
        </View>

        {/* Status Pill on LCD */}
        <View
          style={{
            backgroundColor: badgeInfo.bg,
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: radii.full,
          }}
        >
          <Text
            style={{
              color: badgeInfo.color,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {badgeInfo.label}
          </Text>
        </View>
      </View>

      {/* Main Big Digits */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          paddingVertical: spacing.xs,
          gap: spacing.xs,
        }}
      >
        <Text
          style={{
            color: colors.lcdText,
            fontSize: typography.fontSize.lcd,
            fontWeight: '900',
            letterSpacing: typography.letterSpacing.lcd,
            fontFamily: typography.fontFamily.mono,
          }}
        >
          {normalized}
        </Text>
        <View style={{ alignItems: 'flex-start' }}>
          <Text
            style={{
              color: colors.lcdText,
              fontSize: typography.fontSize.base,
              fontWeight: '800',
            }}
          >
            MHz
          </Text>
          <Text
            style={{
              color: colors.lcdTextDim,
              fontSize: typography.fontSize.xxs,
              fontWeight: '700',
            }}
          >
            V-NET
          </Text>
        </View>
      </View>

      {/* Channel Name Banner */}
      <Text
        style={{
          color: colors.amber,
          fontSize: typography.fontSize.xs,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.wide,
          textAlign: 'center',
          marginBottom: spacing.xs,
        }}
      >
        {channelName?.toUpperCase()}
      </Text>

      {/* Bottom Sub-info */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.xs,
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 255, 204, 0.12)',
          paddingTop: spacing.xs,
        }}
      >
        <Text
          style={{
            color: colors.lcdTextDim,
            fontSize: typography.fontSize.xxs,
            fontWeight: '700',
            letterSpacing: 1,
          }}
        >
          OCCUPANCY: {userCount} / {maxUsers}
        </Text>
        <Text
          style={{
            color: isTransmitting ? colors.emerald : colors.lcdTextDim,
            fontSize: typography.fontSize.xxs,
            fontWeight: '800',
            letterSpacing: 1,
          }}
        >
          {isTransmitting ? '● TX TRANSMITTING' : '○ RX MONITORING'}
        </Text>
      </View>
    </View>
  );
};
