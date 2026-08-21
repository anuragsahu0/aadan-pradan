import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Avatar } from '../../src/components/common/Avatar';
import { Badge } from '../../src/components/common/Badge';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { updateMe } from '../../src/api/authApi';
import { hapticFeedback } from '../../src/utils/haptics';

export default function MeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const authUser = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);
  const setAuthUser = useAuthStore((s) => s.setUser);

  const { callsign, stats, status, setCallsign, setStatus } = useUserStore();

  // Active user data (from auth store or fallback)
  const displayName = authUser?.displayName || 'Operator';
  const username = authUser?.username || 'operator';
  const email = authUser?.email || 'operator@aadanpradan.net';
  const memberSince = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Active Session';

  const [displayNameInput, setDisplayNameInput] = useState(displayName);
  const [callsignInput, setCallsignInput] = useState(callsign);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveProfile = async () => {
    hapticFeedback.light();
    setIsSaving(true);

    try {
      if (displayNameInput.trim() && displayNameInput.trim() !== displayName) {
        const updated = await updateMe({ displayName: displayNameInput.trim() });
        setAuthUser(updated);
      }
      setCallsign(callsignInput.trim().toUpperCase() || 'OPERATOR');
      hapticFeedback.success();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert('Update Failed', err.message || 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = (newStatus: 'online' | 'idle') => {
    hapticFeedback.light();
    setStatus(newStatus);
  };

  const handleLogout = () => {
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
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {/* Header */}
        <AppHeader
          title="OPERATOR IDENTITY"
          showBrand={false}
          rightElement={
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/settings')}
              style={{
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: 1,
                padding: spacing.xs,
                borderRadius: radii.md,
                minWidth: 40,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>
          }
        />

        {/* Profile Card */}
        <Card variant="tactical">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar displayName={displayName} size={68} status={status} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.lg, fontWeight: '900' }}>
                {displayName}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                @{username}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, marginTop: 2 }}>
                {email}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }}>
                <Badge label={`CALLSIGN: ${callsign}`} variant="cyan" />
                {authUser?.role === 'ADMIN' && <Badge label="ADMIN" variant="cyan" />}
                <Badge label={status.toUpperCase()} variant={status === 'online' ? 'emerald' : 'amber'} dot />
              </View>
            </View>
          </View>
        </Card>

        {/* Admin Navigation Button (Visible if user possesses ADMIN role) */}
        {authUser?.role === 'ADMIN' && (
          <Card variant="elevated" style={{ borderColor: colors.primary }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: '800', letterSpacing: 1 }}>
                  🛡️ ADMIN CONTROL CENTER
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, marginTop: 2 }}>
                  System metrics, user management, and security telemetry
                </Text>
              </View>
              <Button
                label="OPEN DASHBOARD"
                variant="tactical"
                size="sm"
                onPress={() => router.push('/admin')}
              />
            </View>
          </Card>
        )}

        {/* Radio Presence Mode */}
        <Card variant="default">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: spacing.xs,
            }}
          >
            RADIO PRESENCE MODE
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TouchableOpacity
              onPress={() => handleStatusToggle('online')}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                backgroundColor: status === 'online' ? colors.emeraldMuted : colors.surfaceSubtle,
                borderColor: status === 'online' ? colors.emerald : colors.border,
                borderWidth: 1.5,
                borderRadius: radii.md,
              }}
            >
              <Text style={{ color: status === 'online' ? colors.emerald : colors.textSecondary, fontWeight: '800' }}>
                ● Active / Ready
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStatusToggle('idle')}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                backgroundColor: status === 'idle' ? colors.amberMuted : colors.surfaceSubtle,
                borderColor: status === 'idle' ? colors.amber : colors.border,
                borderWidth: 1.5,
                borderRadius: radii.md,
              }}
            >
              <Text style={{ color: status === 'idle' ? colors.amber : colors.textSecondary, fontWeight: '800' }}>
                ○ Standby / Idle
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Profile & Callsign Customization */}
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
            EDIT OPERATOR PROFILE
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, marginBottom: spacing.sm }}>
            Update your public operator identity on the virtual frequency network.
          </Text>

          <Input
            label="Display Name"
            value={displayNameInput}
            onChangeText={setDisplayNameInput}
            placeholder="Your full name or handle"
          />

          <Input
            label="Tactical Callsign"
            value={callsignInput}
            onChangeText={setCallsignInput}
            autoCapitalize="characters"
            placeholder="e.g. ALPHA-01, VIPER"
            helperText="Transmitted during Push-to-Talk sessions"
          />

          <Button
            label={savedNotice ? 'PROFILE SAVED ✓' : isSaving ? 'SAVING...' : 'SAVE CHANGES'}
            variant={savedNotice ? 'tactical' : 'primary'}
            loading={isSaving}
            onPress={handleSaveProfile}
          />
        </Card>

        {/* Communication Metrics */}
        <Card variant="default">
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginBottom: spacing.xs,
            }}
          >
            COMMUNICATION METRICS & IDENTITY
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radii.md,
                borderColor: colors.border,
                borderWidth: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
                FREQUENCIES JOINED
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.xl,
                  fontWeight: '900',
                  marginTop: 2,
                }}
              >
                {stats.frequenciesJoined}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radii.md,
                borderColor: colors.border,
                borderWidth: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
                MEMBER SINCE
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: '800',
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                {memberSince}
              </Text>
            </View>
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          label="SIGN OUT / DISCONNECT"
          variant="danger"
          size="md"
          onPress={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
