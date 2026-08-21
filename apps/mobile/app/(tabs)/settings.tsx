import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';
import { useHealthCheck } from '../../src/api/healthApi';
import { useAppConfig } from '../../src/api/configApi';
import { storageService } from '../../src/services/storageService';
import { ONBOARDING_STORAGE_KEY } from '../splash';
import { useAuthStore } from '../../src/store/authStore';
import { notificationService } from '../../src/services/notifications/notificationService';
import { networkService } from '../../src/services/networkService';
import { hapticFeedback } from '../../src/utils/haptics';
import { APP_NAME, APP_VERSION, BUILD_NUMBER, SERVICE_NAME, MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, themeMode, setThemeMode, isDark } = useTheme();
  const { data: healthData, refetch: refetchHealth, isFetching: isCheckingHealth } = useHealthCheck();
  const { data: configData } = useAppConfig();
  const authLogout = useAuthStore((s) => s.logout);

  // Audio & Haptic Controls
  const [speakerOutput, setSpeakerOutput] = useState<'loudspeaker' | 'earpiece'>('loudspeaker');
  const [micInput, setMicInput] = useState<'device' | 'headset'>('device');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [noiseReduction, setNoiseReduction] = useState(true);

  // Notification Preferences
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [frequencyNotifications, setFrequencyNotifications] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<string>('not_determined');

  useEffect(() => {
    notificationService.getPermissionStatus().then((status) => {
      setNotificationPermission(status);
    });
  }, []);

  const handleThemeSelect = (mode: 'system' | 'dark' | 'light') => {
    hapticFeedback.light();
    setThemeMode(mode);
  };

  const handleRequestNotificationPermission = async () => {
    hapticFeedback.light();
    const granted = await notificationService.requestPermissions();
    const status = await notificationService.getPermissionStatus();
    setNotificationPermission(status);
    if (granted) {
      hapticFeedback.success();
    } else {
      hapticFeedback.warning();
    }
  };

  const handleResetOnboarding = async () => {
    hapticFeedback.warning();
    await storageService.deleteItem(ONBOARDING_STORAGE_KEY);
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {/* Header */}
        <AppHeader
          title="SETTINGS"
          showBrand={false}
          onBack={() => router.push('/(tabs)/me')}
          statusBadge={isDark ? 'DARK THEME' : 'LIGHT THEME'}
          statusVariant="cyan"
        />

        {/* Section 1: Appearance */}
        <Card variant="tactical">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: spacing.xs,
            }}
          >
            APPEARANCE & THEME
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {[
              { key: 'dark', label: 'Dark Mode', icon: '🌙' },
              { key: 'light', label: 'Light Mode', icon: '☀️' },
              { key: 'system', label: 'System', icon: '💻' },
            ].map((item) => {
              const isSelected = themeMode === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleThemeSelect(item.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceSubtle,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: 1.5,
                    borderRadius: radii.md,
                    gap: 4,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.label}`}
                >
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  <Text
                    style={{
                      color: isSelected ? colors.primary : colors.textSecondary,
                      fontSize: typography.fontSize.xs,
                      fontWeight: '800',
                    }}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Section 2: Push Notifications */}
        <Card variant="elevated">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
              }}
            >
              NOTIFICATIONS & ALERTS
            </Text>
            <Badge
              label={notificationPermission.toUpperCase()}
              variant={notificationPermission === 'granted' ? 'emerald' : 'neutral'}
            />
          </View>

          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, marginBottom: spacing.sm }}>
            Manage push notification preferences and channel alerts.
          </Text>

          {/* System Notifications Switch */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
                System Notifications
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs }}>
                Critical network & maintenance notices
              </Text>
            </View>

            <Switch
              value={systemNotifications}
              onValueChange={setSystemNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Frequency Notifications Switch */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.xs,
            }}
          >
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
                Frequency Invites
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs }}>
                Channel invites and operator callouts
              </Text>
            </View>

            <Switch
              value={frequencyNotifications}
              onValueChange={setFrequencyNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {notificationPermission !== 'granted' && (
            <Button
              label="ENABLE PUSH NOTIFICATIONS"
              variant="tactical"
              size="sm"
              onPress={handleRequestNotificationPermission}
              style={{ marginTop: spacing.xs }}
            />
          )}
        </Card>

        {/* Section 3: Audio & Haptics */}
        <Card variant="elevated">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: 4,
            }}
          >
            AUDIO ROUTING & HAPTICS
          </Text>

          {/* Speaker Output Selector */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
                Speaker Output
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs }}>
                Audio playback destination
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
              <TouchableOpacity
                onPress={() => setSpeakerOutput('loudspeaker')}
                style={{
                  backgroundColor: speakerOutput === 'loudspeaker' ? colors.primaryMuted : colors.surfaceSubtle,
                  borderColor: speakerOutput === 'loudspeaker' ? colors.primary : colors.border,
                  borderWidth: 1,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: radii.sm,
                }}
              >
                <Text style={{ color: speakerOutput === 'loudspeaker' ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                  Speaker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSpeakerOutput('earpiece')}
                style={{
                  backgroundColor: speakerOutput === 'earpiece' ? colors.primaryMuted : colors.surfaceSubtle,
                  borderColor: speakerOutput === 'earpiece' ? colors.primary : colors.border,
                  borderWidth: 1,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: radii.sm,
                }}
              >
                <Text style={{ color: speakerOutput === 'earpiece' ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                  Earpiece
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Haptic Feedback Switch */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.xs,
            }}
          >
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' }}>
                PTT Haptic Vibration
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs }}>
                Tactile feedback on press & release
              </Text>
            </View>

            <Switch
              value={hapticsEnabled}
              onValueChange={(val) => {
                setHapticsEnabled(val);
                if (val) hapticFeedback.success();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {/* Section 4: Server Link Diagnostics */}
        <Card variant="default">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
              }}
            >
              SERVER LINK & DIAGNOSTICS
            </Text>
            <Badge
              label={healthData?.status === 'ok' ? 'HEALTHY' : 'CONNECTING'}
              variant={healthData?.status === 'ok' ? 'emerald' : 'amber'}
              dot
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs }}>Network Status</Text>
            <Text style={{ color: networkService.isOnline() ? colors.emerald : colors.crimson, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
              {networkService.isOnline() ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs }}>Service</Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
              {healthData?.service || SERVICE_NAME}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs }}>Channel Limit</Text>
            <Text style={{ color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: '800' }}>
              {configData?.maxUsersPerFrequency ?? MAX_USERS_PER_FREQUENCY} users max
            </Text>
          </View>

          <Button
            label={isCheckingHealth ? 'PROBING...' : 'PING SERVER HEALTH'}
            variant="tactical"
            size="sm"
            loading={isCheckingHealth}
            onPress={() => refetchHealth()}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {/* Section 5: Account & Onboarding Tools */}
        <Card variant="elevated">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: spacing.xs,
            }}
          >
            DEVELOPMENT & ACCOUNT CONTROLS
          </Text>

          <Button
            label="RE-RUN ONBOARDING WALKTHROUGH"
            variant="tactical"
            size="sm"
            onPress={handleResetOnboarding}
            style={{ marginBottom: spacing.xs }}
          />

          <Button
            label="SIGN OUT / DISCONNECT OPERATOR"
            variant="danger"
            size="sm"
            onPress={() => {
              hapticFeedback.warning();
              Alert.alert(
                'Sign Out',
                'Are you sure you want to disconnect and log out of your operator session?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                      await authLogout();
                      hapticFeedback.success();
                      router.replace('/auth/login');
                    },
                  },
                ]
              );
            }}
          />
        </Card>

        {/* Section 6: About */}
        <Card variant="default">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: 4,
            }}
          >
            ABOUT AADAN PRADAN
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.base, fontWeight: '800' }}>
            {APP_NAME.toUpperCase()}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, marginTop: 2 }}>
            Mobile-first, internet-based, virtual-frequency walkie-talkie platform.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs }}>Client Version</Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
              v{APP_VERSION} (Build {BUILD_NUMBER})
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
