import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import type { UserSummary } from '@aadan-pradan/types';

export interface UserStatusProps {
  user: UserSummary;
  isSpeaker?: boolean;
}

export const UserStatus: React.FC<UserStatusProps> = ({ user, isSpeaker = false }) => {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: isSpeaker ? colors.emeraldMuted : colors.surfaceSubtle,
        borderColor: isSpeaker ? colors.emerald : colors.border,
        borderWidth: 1,
        borderRadius: radii.md,
        gap: spacing.sm,
        minHeight: 50,
      }}
    >
      <Avatar
        displayName={user.displayName}
        avatarUrl={user.avatar}
        size={36}
        isSpeaker={isSpeaker}
        status={isSpeaker ? 'speaking' : user.status}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
          {user.displayName}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xxs }}>
          @{user.username}
        </Text>
      </View>
      {isSpeaker ? (
        <Badge label="SPEAKING" variant="emerald" dot pulse />
      ) : (
        <Badge
          label={user.status === 'online' ? 'LISTENING' : user.status.toUpperCase()}
          variant={user.status === 'online' ? 'cyan' : 'neutral'}
          dot={user.status === 'online'}
        />
      )}
    </View>
  );
};
