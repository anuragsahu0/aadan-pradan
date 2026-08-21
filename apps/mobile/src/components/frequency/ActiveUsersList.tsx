import React, { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  type ListRenderItemInfo,
} from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { EmptyState } from '../feedback/EmptyState';
import type { UserSummary } from '@aadan-pradan/types';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';

export interface ActiveUsersListProps {
  users: UserSummary[];
  maxUsers?: number;
  activeSpeakerId?: string | null;
  onToggleCapacity?: () => void;
  is40CapacityLoaded?: boolean;
}

// Memoized user item for 60fps virtualization with 40+ users
const UserRow = memo(({ user, isSpeaker }: { user: UserSummary; isSpeaker: boolean }) => {
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
        minHeight: 52,
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
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSize.sm,
            fontWeight: '700',
          }}
          numberOfLines={1}
        >
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
});

UserRow.displayName = 'UserRow';

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  users,
  maxUsers = MAX_USERS_PER_FREQUENCY,
  activeSpeakerId,
  onToggleCapacity,
  is40CapacityLoaded = false,
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const count = users.length;
  const isFull = count >= maxUsers;

  const renderItem = ({ item }: ListRenderItemInfo<UserSummary>) => (
    <UserRow user={item} isSpeaker={item.id === activeSpeakerId} />
  );

  return (
    <View style={{ marginVertical: spacing.sm }}>
      {/* Header with Occupancy Meter & 40 Capacity Tester */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
            }}
          >
            ONLINE OPERATORS
          </Text>
          <View
            style={{
              backgroundColor: isFull ? colors.crimsonMuted : colors.primaryMuted,
              borderColor: isFull ? colors.crimson : colors.primary,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radii.full,
            }}
          >
            <Text
              style={{
                color: isFull ? colors.crimson : colors.primary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
              }}
            >
              {count} / {maxUsers}
            </Text>
          </View>
        </View>

        {onToggleCapacity && (
          <TouchableOpacity
            onPress={onToggleCapacity}
            style={{
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderWidth: 1,
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: radii.sm,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
              {is40CapacityLoaded ? 'Load 12 Users' : 'Simulate 40 Users (Full)'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Search Bar if users count > 8 */}
      {count > 8 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.md,
            paddingHorizontal: spacing.sm,
            height: 38,
            marginBottom: spacing.xs,
          }}
        >
          <Text style={{ marginRight: 6, fontSize: 12 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Filter ${count} operators...`}
            placeholderTextColor={colors.textDisabled}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: typography.fontSize.xs,
              paddingVertical: 0,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredUsers.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'NO MATCHING OPERATORS' : 'CHANNEL QUIET'}
          description={
            searchQuery
              ? `No operators found matching "${searchQuery}".`
              : `0 / ${maxUsers} operators currently on this frequency.`
          }
          style={{ paddingVertical: spacing.md }}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xxs }} />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};
