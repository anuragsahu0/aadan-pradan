import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserAccountStatus,
  fetchAdminFrequencies,
  deactivateVirtualFrequency,
  fetchAdminAuditLogs,
  fetchAdminSecuritySummary,
} from '../../src/api/adminApi';
import type {
  AdminOverviewStats,
  AdminUserListItem,
  AdminFrequencyListItem,
  AuditLogEntry,
  AdminSecuritySummary,
} from '@aadan-pradan/types';
import { hapticFeedback } from '../../src/utils/haptics';

type TabType = 'overview' | 'users' | 'frequencies' | 'audit' | 'security';

export default function AdminControlCenterScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);

  // Data states
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [frequenciesList, setFrequenciesList] = useState<AdminFrequencyListItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [securitySummary, setSecuritySummary] = useState<AdminSecuritySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load Data based on Active Tab
  const loadTabData = async (tab: TabType) => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const data = await fetchAdminOverview();
        setOverview(data);
      } else if (tab === 'users') {
        const data = await fetchAdminUsers({ q: searchQuery });
        setUsersList(data.users);
      } else if (tab === 'frequencies') {
        const data = await fetchAdminFrequencies();
        setFrequenciesList(data.frequencies);
      } else if (tab === 'audit') {
        const data = await fetchAdminAuditLogs();
        setAuditLogs(data.logs);
      } else if (tab === 'security') {
        const data = await fetchAdminSecuritySummary();
        setSecuritySummary(data);
      }
    } catch (err: any) {
      Alert.alert('Access Denied', err.message || 'Administrator authorization required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const handleUserStatusToggle = (targetUser: AdminUserListItem) => {
    const isSuspended = targetUser.status === 'SUSPENDED';
    const nextStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';
    const actionLabel = isSuspended ? 'Unsuspend' : 'Suspend';

    if (targetUser.id === user?.id) {
      Alert.alert('Action Prohibited', 'Administrators cannot suspend their own account.');
      return;
    }

    Alert.alert(
      `${actionLabel} Operator Account`,
      `Are you sure you want to ${actionLabel.toLowerCase()} @${targetUser.username}? ${
        !isSuspended ? 'Their active sessions and voice connections will be immediately terminated.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              hapticFeedback.warning();
              await updateUserAccountStatus(targetUser.id, nextStatus);
              hapticFeedback.success();
              await loadTabData('users');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleDeactivateFrequency = (freq: AdminFrequencyListItem) => {
    Alert.alert(
      'Deactivate Frequency',
      `Are you sure you want to deactivate virtual frequency ${freq.frequencyCode}? All connected operators will be notified and floor locks released.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticFeedback.warning();
              await deactivateVirtualFrequency(freq.frequencyCode);
              hapticFeedback.success();
              await loadTabData('frequencies');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
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
          title="CONTROL CENTER"
          showBrand={false}
          onBack={() => router.push('/(tabs)/me')}
          statusBadge="ADMIN ROOT"
          statusVariant="cyan"
        />

        {/* Tab Selector Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
          {(['overview', 'users', 'frequencies', 'audit', 'security'] as TabType[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  hapticFeedback.light();
                  setActiveTab(tab);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: radii.sm,
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceSubtle,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 1,
                  }}
                >
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />}

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'overview' && overview && (
          <View style={{ gap: spacing.md }}>
            <Card variant="tactical">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
                  SYSTEM INTEGRITY
                </Text>
                <Badge
                  label={overview.systemHealth}
                  variant={overview.systemHealth === 'HEALTHY' ? 'emerald' : 'amber'}
                  dot
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceSubtle, padding: spacing.sm, borderRadius: radii.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>TOTAL OPERATORS</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{overview.totalUsers}</Text>
                </View>

                <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceSubtle, padding: spacing.sm, borderRadius: radii.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>ONLINE OPERATORS</Text>
                  <Text style={{ color: colors.emerald, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{overview.onlineUsers}</Text>
                </View>

                <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceSubtle, padding: spacing.sm, borderRadius: radii.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>ACTIVE FREQUENCIES</Text>
                  <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{overview.activeFrequencies}</Text>
                </View>

                <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceSubtle, padding: spacing.sm, borderRadius: radii.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>SUSPENDED</Text>
                  <Text style={{ color: overview.suspendedUsers > 0 ? colors.crimson : colors.textSecondary, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                    {overview.suspendedUsers}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Tab 2: USERS */}
        {activeTab === 'users' && (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by username or email..."
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radii.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: colors.textPrimary,
                  fontSize: 13,
                }}
              />
              <Button label="SEARCH" size="sm" variant="tactical" onPress={() => loadTabData('users')} />
            </View>

            {usersList.map((u) => (
              <Card key={u.id} variant="default" style={{ padding: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>{u.displayName}</Text>
                      <Badge label={u.role} variant={u.role === 'ADMIN' ? 'cyan' : 'neutral'} />
                      <Badge label={u.status} variant={u.status === 'ACTIVE' ? 'emerald' : 'crimson'} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>@{u.username} • {u.email}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleUserStatusToggle(u)}
                    style={{
                      backgroundColor: u.status === 'ACTIVE' ? colors.crimsonMuted : colors.emeraldMuted,
                      borderColor: u.status === 'ACTIVE' ? colors.crimson : colors.emerald,
                      borderWidth: 1,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: radii.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: u.status === 'ACTIVE' ? colors.crimson : colors.emerald,
                        fontSize: 10,
                        fontWeight: '900',
                        letterSpacing: 1,
                      }}
                    >
                      {u.status === 'ACTIVE' ? 'SUSPEND' : 'UNSUSPEND'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 3: FREQUENCIES */}
        {activeTab === 'frequencies' && (
          <View style={{ gap: spacing.sm }}>
            {frequenciesList.map((f) => (
              <Card key={f.id} variant="default" style={{ padding: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>
                      {f.frequencyCode} MHz
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {f.name || 'General Virtual Frequency'} • {f.memberCount}/{f.maxUsers} Users
                    </Text>
                    {f.activeSpeaker && (
                      <Text style={{ color: colors.amber, fontSize: 10, fontWeight: '800', marginTop: 4 }}>
                        🎙️ SPEAKER: {f.activeSpeaker.displayName}
                      </Text>
                    )}
                  </View>

                  {f.isActive ? (
                    <TouchableOpacity
                      onPress={() => handleDeactivateFrequency(f)}
                      style={{
                        backgroundColor: colors.crimsonMuted,
                        borderColor: colors.crimson,
                        borderWidth: 1,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: radii.sm,
                      }}
                    >
                      <Text style={{ color: colors.crimson, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                        DEACTIVATE
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Badge label="INACTIVE" variant="neutral" />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <View style={{ gap: spacing.xs }}>
            {auditLogs.map((log) => (
              <Card key={log.id} variant="default" style={{ padding: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>
                    {log.action}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
                {log.targetId && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Target: {log.targetType} ({log.targetId})
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* Tab 5: SECURITY */}
        {activeTab === 'security' && securitySummary && (
          <Card variant="tactical">
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: spacing.sm }}>
              SECURITY TELEMETRY (LAST 24H)
            </Text>

            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Failed Login Attempts</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }}>{securitySummary.failedLoginsLast24h}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Suspended Accounts</Text>
                <Text style={{ color: colors.crimson, fontSize: 12, fontWeight: '800' }}>{securitySummary.suspendedUsersCount}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Rate-Limit Triggers</Text>
                <Text style={{ color: colors.amber, fontSize: 12, fontWeight: '800' }}>{securitySummary.rateLimitEventsCount}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Unauthorized Floor Requests</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }}>{securitySummary.unauthorizedPttAttempts}</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
