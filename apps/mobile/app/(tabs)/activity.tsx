import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';
import { MOCK_ACTIVITIES, type ActivityItem } from '../../src/features/activity/mocks/mockActivity';
import { useFrequencyStore } from '../../src/store/frequencyStore';
import { hapticFeedback } from '../../src/utils/haptics';

export default function ActivityScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { connectToFrequency } = useFrequencyStore();
  const [filter, setFilter] = useState<'all' | 'joined' | 'transmitted'>('all');

  const filteredActivities = MOCK_ACTIVITIES.filter((item) => {
    if (filter === 'joined') return item.action === 'joined' || item.action === 'left';
    if (filter === 'transmitted') return item.action === 'transmitted';
    return true;
  });

  const handleTune = async (code: string) => {
    hapticFeedback.light();
    await connectToFrequency(code);
    router.push('/(tabs)/frequency');
  };

  const getActionBadge = (action: ActivityItem['action']) => {
    switch (action) {
      case 'transmitted':
        return { label: 'TRANSMITTED', variant: 'emerald' as const, icon: '🎙️' };
      case 'joined':
        return { label: 'JOINED', variant: 'cyan' as const, icon: '⚡' };
      case 'left':
        return { label: 'LEFT CHANNEL', variant: 'neutral' as const, icon: '⏹' };
      default:
        return { label: 'ACTIVITY', variant: 'neutral' as const, icon: '●' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {/* Top Header */}
        <AppHeader
          title="COMMUNICATION LOG"
          showBrand={false}
          statusBadge="LOCAL HISTORY"
          statusVariant="neutral"
        />

        {/* Overview Banner */}
        <Card variant="tactical">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: 2,
            }}
          >
            SESSION AUDIT TRAIL
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSize.lg,
              fontWeight: '900',
            }}
          >
            Recent Frequency Activity
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
              marginTop: 4,
              lineHeight: typography.lineHeight.sm,
            }}
          >
            Review past channel sessions, transmission durations, and connection logs.
          </Text>
        </Card>

        {/* Filter Chips */}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[
            { key: 'all', label: 'All History' },
            { key: 'joined', label: 'Channel Hops' },
            { key: 'transmitted', label: 'Transmissions' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                hapticFeedback.light();
                setFilter(item.key as any);
              }}
              style={{
                backgroundColor: filter === item.key ? colors.primaryMuted : colors.surfaceElevated,
                borderColor: filter === item.key ? colors.primary : colors.border,
                borderWidth: 1,
                paddingVertical: 6,
                paddingHorizontal: spacing.md,
                borderRadius: radii.full,
              }}
            >
              <Text
                style={{
                  color: filter === item.key ? colors.primary : colors.textSecondary,
                  fontSize: typography.fontSize.xs,
                  fontWeight: '700',
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Feed */}
        <View style={{ gap: spacing.sm }}>
          {filteredActivities.map((act) => {
            const badge = getActionBadge(act.action);
            return (
              <Card key={act.id} variant="default" style={{ padding: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>{badge.icon}</Text>
                    <Text
                      style={{
                        color: colors.lcdText,
                        fontSize: typography.fontSize.base,
                        fontWeight: '900',
                        fontFamily: typography.fontFamily.mono,
                      }}
                    >
                      {act.frequencyCode} MHz
                    </Text>
                  </View>

                  <Badge label={badge.label} variant={badge.variant} dot />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xs }}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
                      {act.channelName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, marginTop: 2 }}>
                      {act.relativeTime}
                      {act.durationSeconds ? ` • Duration: ${act.durationSeconds}s` : ''}
                      {act.participantsCount ? ` • ${act.participantsCount} operators present` : ''}
                    </Text>
                  </View>

                  <Button
                    label="TUNE"
                    variant="tactical"
                    size="sm"
                    onPress={() => handleTune(act.frequencyCode)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
