import React from 'react';
import { View, Text, StyleSheet, Image, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { UserPresenceStatus } from '@aadan-pradan/types';

export interface AvatarProps {
  displayName?: string;
  avatarUrl?: string | null;
  size?: number;
  status?: UserPresenceStatus;
  isSpeaker?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  displayName = 'User',
  avatarUrl,
  size = 40,
  status,
  isSpeaker = false,
  style,
}) => {
  const { colors, typography } = useTheme();

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (presence?: UserPresenceStatus): string => {
    if (isSpeaker) return colors.emerald;
    switch (presence) {
      case 'speaking':
        return colors.emerald;
      case 'online':
        return colors.primary;
      case 'idle':
        return colors.amber;
      case 'offline':
      default:
        return colors.textDisabled;
    }
  };

  const dotSize = Math.max(9, Math.round(size * 0.26));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          position: 'relative',
        },
        style,
      ]}
    >
      {/* Outer speaker ring if speaking */}
      {isSpeaker && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: (size + 6) / 2,
            borderColor: colors.emerald,
            borderWidth: 2,
          }}
        />
      )}

      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceElevated,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isSpeaker ? colors.emeraldMuted : colors.surfaceElevated,
            borderColor: isSpeaker ? colors.emerald : colors.borderStrong,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: isSpeaker ? colors.emerald : colors.primary,
              fontSize: Math.round(size * 0.38),
              fontWeight: '800',
            }}
          >
            {getInitials(displayName)}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={{
            position: 'absolute',
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: getStatusColor(status),
            borderColor: colors.surface,
            borderWidth: 2,
            bottom: 0,
            right: 0,
          }}
        />
      )}
    </View>
  );
};
