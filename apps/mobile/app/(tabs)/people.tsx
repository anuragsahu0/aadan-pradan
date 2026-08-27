import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useFrequencyStore } from '../../src/store/frequencyStore';
import { usePttStore } from '../../src/features/voice/store/pttStore';

export default function PeopleScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeUsers, currentFrequencyCode } = useFrequencyStore();
  const { activeSpeaker, isTalking } = usePttStore();
  const [tab, setTab] = useState<'online' | 'all'>('online');

  // Build real operators roster: Ensure current user is always included if roster empty
  const realUsers = React.useMemo(() => {
    if (activeUsers && activeUsers.length > 0) {
      return activeUsers;
    }
    return [
      {
        id: user?.id || 'me',
        username: user?.username || 'operator',
        displayName: user?.displayName || 'Operator',
        status: 'online' as const,
      },
    ];
  }, [activeUsers, user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
          <Text style={styles.headerTitle}>People</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerIconBtn}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
            </Pressable>
            <Pressable style={styles.headerIconBtn}>
              <Text style={{ fontSize: 16 }}>👤⁺</Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.segmentedRow}>
          <Pressable
            onPress={() => setTab('online')}
            style={[styles.segmentBtn, tab === 'online' && styles.segmentBtnActive]}
          >
            <Text
              style={[
                styles.segmentText,
                tab === 'online' && styles.segmentTextActive,
              ]}
            >
              Online ({realUsers.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('all')}
            style={[styles.segmentBtn, tab === 'all' && styles.segmentBtnActive]}
          >
            <Text
              style={[
                styles.segmentText,
                tab === 'all' && styles.segmentTextActive,
              ]}
            >
              All ({realUsers.length})
            </Text>
          </Pressable>
        </View>

        {/* Real Operators List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          {realUsers.map((person) => {
            const isMe = person.id === user?.id || person.id === 'me';
            const isSpeaking =
              activeSpeaker?.id === person.id ||
              (isMe && isTalking);

            return (
              <View key={person.id} style={styles.userRow}>
                {/* Avatar with Status Dot */}
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarCircle}>
                    <Text style={{ fontSize: 22 }}>
                      {person.avatar || (isMe ? '👤' : '👨🏽‍💻')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isSpeaking ? '#22C55E' : '#22C55E' },
                    ]}
                  />
                </View>

                {/* Name and State */}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {isMe ? `${person.displayName} (You)` : person.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.userStatusText,
                      isSpeaking && { color: '#22C55E', fontWeight: '700' },
                    ]}
                  >
                    {isSpeaking
                      ? 'Speaking...'
                      : `Online • ${currentFrequencyCode || '145.800'}`}
                  </Text>
                </View>

                {/* Badges / Controls */}
                {isMe && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.crownIcon}>👑</Text>
                    <Text style={styles.adminText}>Operator</Text>
                  </View>
                )}

                {isSpeaking && (
                  <View style={styles.speakingWave}>
                    <Text style={{ color: '#22C55E', fontSize: 16 }}>📶</Text>
                  </View>
                )}

                {!isMe && !isSpeaking && (
                  <View style={styles.actionBtn}>
                    <Text style={{ fontSize: 16, color: '#94A3B8' }}>🎙️</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Quick Action Grid */}
          <View style={styles.gridSection}>
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Invite link copied! Share it with anyone to talk.');
                  }
                }}
                style={styles.gridCard}
              >
                <Text style={styles.cardEmoji}>👤⁺</Text>
                <Text style={styles.cardLabel}>Invite Link</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/channels')}
                style={[styles.gridCard, styles.gridCardGreen]}
              >
                <Text style={{ fontSize: 18, color: '#22C55E' }}>((•))</Text>
                <Text style={[styles.cardLabel, { color: '#22C55E' }]}>
                  Channels
                </Text>
              </Pressable>
            </View>

            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/(tabs)/me')}
                style={styles.gridCard}
              >
                <Text style={styles.cardEmoji}>⚙️</Text>
                <Text style={styles.cardLabel}>Settings</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)')}
                style={styles.gridCard}
              >
                <Text style={styles.cardEmoji}>📻</Text>
                <Text style={styles.cardLabel}>Ptt Radio</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#151A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#151A24',
    borderRadius: 24,
    padding: 4,
    marginVertical: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FF7A00',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
    gap: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242C3C',
    padding: 12,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#151A24',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  crownIcon: {
    fontSize: 11,
  },
  adminText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF7A00',
  },
  speakingWave: {
    paddingHorizontal: 4,
  },
  actionBtn: {
    padding: 6,
  },
  gridSection: {
    marginTop: 16,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#151A24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242C3C',
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gridCardGreen: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  cardEmoji: {
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
