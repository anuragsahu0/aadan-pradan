import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme';
import { socketManager } from '../../services/socket/socketManager';
import { useAuthStore } from '../../store/authStore';
import type { ConnectionState } from '@aadan-pradan/types';

export const ConnectionStatusBar: React.FC = () => {
  const { colors, typography, spacing } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socketManager.getConnectionState()
  );

  useEffect(() => {
    const unsubscribe = socketManager.subscribeConnectionState((state) => {
      setConnectionState(state);
    });
    return unsubscribe;
  }, []);

  // If not authenticated (guest/login screen) or fully connected, do not display banner
  if (!isAuthenticated || connectionState === 'CONNECTED') {
    return null;
  }

  const isReconnecting = connectionState === 'RECONNECTING' || connectionState === 'CONNECTING';
  const isDisconnected = connectionState === 'DISCONNECTED' || connectionState === 'ERROR';

  const bgColor = isReconnecting ? colors.amberMuted : colors.crimsonMuted;
  const borderColor = isReconnecting ? colors.amber : colors.crimson;
  const textColor = isReconnecting ? colors.amber : colors.crimson;

  const label = isReconnecting
    ? 'Connecting to Virtual Frequency Network...'
    : 'Offline — Disconnected from Network';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderBottomWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: textColor,
        }}
      />
      <Text
        style={{
          color: textColor,
          fontSize: typography.fontSize.xxs,
          fontWeight: '800',
          letterSpacing: typography.letterSpacing.tactical,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};
