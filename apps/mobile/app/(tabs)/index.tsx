import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { FrequencyInput } from '../../src/components/frequency/FrequencyInput';
import { FrequencyCard } from '../../src/components/frequency/FrequencyCard';
import { useFrequencyStore } from '../../src/store/frequencyStore';
import { useUserStore } from '../../src/store/userStore';
import { useHealthCheck } from '../../src/api/healthApi';
import { MOCK_FREQUENCIES } from '../../src/features/frequency/mocks/mockFrequencies';
import { APP_NAME, APP_TAGLINE, MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { currentUser, callsign } = useUserStore();
  const { currentFrequencyCode, connectToFrequency } = useFrequencyStore();
  const { data: healthData, isError, refetch } = useHealthCheck();

  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time-of-day personalized greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleConnect = async (code: string) => {
    setConnecting(true);
    await connectToFrequency(code);
    setConnecting(false);
    router.push('/(tabs)/frequency');
  };

  const handleTuneRecent = async (code: string) => {
    await connectToFrequency(code);
    router.push('/(tabs)/frequency');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const isServerOnline = !!healthData && healthData.status === 'ok';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Top Header */}
        <AppHeader
          showBrand
          subtitle={APP_TAGLINE}
          statusBadge={isServerOnline ? 'SERVER ONLINE' : isError ? 'SERVER OFFLINE' : 'READY'}
          statusVariant={isServerOnline ? 'emerald' : isError ? 'crimson' : 'cyan'}
        />

        {/* Personalized Welcome Banner */}
        <View style={{ paddingHorizontal: spacing.xxs }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xxl, fontWeight: '900' }}>
            {getGreeting()}, {(currentUser?.displayName || 'Operator').split(' ')[0]} 👋
          </Text>
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.md,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.wide,
              marginTop: 2,
            }}
          >
            Your Communication Starts Here
          </Text>
        </View>

        {/* Interactive Connect to a Frequency Component */}
        <FrequencyInput
          initialValue={currentFrequencyCode}
          onConnect={handleConnect}
          loading={connecting}
        />

        {/* Quick Stats Grid */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Card variant="elevated" style={{ flex: 1, padding: spacing.sm, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
              OPERATOR
            </Text>
            <Text style={{ color: colors.primary, fontSize: typography.fontSize.base, fontWeight: '800', marginTop: 2 }}>
              {callsign}
            </Text>
          </Card>

          <Card variant="elevated" style={{ flex: 1, padding: spacing.sm, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
              TUNED FREQ
            </Text>
            <Text style={{ color: colors.lcdText, fontSize: typography.fontSize.base, fontWeight: '900', marginTop: 2, fontFamily: typography.fontFamily.mono }}>
              {currentFrequencyCode}
            </Text>
          </Card>

          <Card variant="elevated" style={{ flex: 1, padding: spacing.sm, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
              MAX USERS
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.base, fontWeight: '800', marginTop: 2 }}>
              {MAX_USERS_PER_FREQUENCY} / ch
            </Text>
          </Card>
        </View>

        {/* Recent & Popular Frequencies List */}
        <View style={{ marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSize.xs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
              }}
            >
              RECENT & ACTIVE FREQUENCIES
            </Text>
            <Badge label="IP VOICE" variant="neutral" />
          </View>

          <View style={{ gap: spacing.sm }}>
            {MOCK_FREQUENCIES.map((channel) => (
              <FrequencyCard
                key={channel.code}
                code={channel.code}
                name={channel.name}
                description={channel.description}
                userCount={channel.activeUsersCount}
                maxUsers={channel.maxUsers}
                lastActive={channel.lastActive}
                isSelected={currentFrequencyCode === channel.code}
                onTune={handleTuneRecent}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
