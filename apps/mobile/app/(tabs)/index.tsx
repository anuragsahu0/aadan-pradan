import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AcousticRaysButton } from '../../src/components/frequency/AcousticRaysButton';
import { ListeningPill } from '../../src/components/frequency/ListeningPill';
import { LiveTransmissionModal } from '../../src/components/frequency/LiveTransmissionModal';
import { useFrequencyStore } from '../../src/store/frequencyStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePttStore } from '../../src/features/voice/store/pttStore';
import { webrtcService } from '../../src/features/voice/services/webrtc.service';
import { hapticFeedback } from '../../src/utils/haptics';

export default function WalkieTalkieHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const {
    currentFrequencyCode,
    channelName,
    connectionStatus,
    userCount,
    activeUsers,
    connectToFrequency,
  } = useFrequencyStore();

  const {
    buttonState,
    activeSpeaker,
    isTalking,
    isBusy,
    remainingSeconds,
    requestTalk,
    releaseTalk,
    resetPtt,
  } = usePttStore();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);

  useEffect(() => {
    // Ensure default frequency 145.800 is connected
    const activeFreq = currentFrequencyCode || '145.800';
    connectToFrequency(activeFreq).catch(() => {});
    resetPtt();
  }, []);

  const handlePttPressIn = async () => {
    hapticFeedback.medium();
    webrtcService.unlockAudioContext();
    const activeFreq = currentFrequencyCode || '145.800';
    await requestTalk(activeFreq);
  };

  const handlePttPressOut = () => {
    hapticFeedback.light();
    const activeFreq = currentFrequencyCode || '145.800';
    releaseTalk(activeFreq);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
    webrtcService.unlockAudioContext();
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const activeChannelTitle = channelName || 'Channel 07';
  const activeFreqDisplay = currentFrequencyCode || '145.800';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* ─── Top Header ────────────────────────────────────────────── */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <Text style={styles.brandIconText}>〰️</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>Aadan Pradan</Text>
              <Text style={styles.brandSubtitle}>Walkie Talkie</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlinePillText}>Online</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/me')}
              style={styles.avatarButton}
            >
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View style={styles.avatarOnlineDot} />
            </Pressable>
          </View>
        </View>

        {/* ─── Active Channel Card ───────────────────────────────────── */}
        <Pressable
          onPress={() => setShowLiveModal(true)}
          style={styles.channelCard}
        >
          <View style={styles.channelCardTop}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.signalBars}>📶</Text>
              <Text style={styles.channelTitle}>{activeChannelTitle}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/channels')}
              style={styles.gearButton}
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </Pressable>
          </View>

          <View style={styles.channelSubRow}>
            <View style={styles.greenDot} />
            <Text style={styles.channelSubText}>
              {activeUsers.length || userCount || 1} Connected Operator{(activeUsers.length || userCount || 1) === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Real-Time Operator Avatar Stack (Only real connected users) */}
          <View style={styles.avatarStack}>
            {(activeUsers && activeUsers.length > 0 ? activeUsers : [{ id: user?.id || 'me', username: user?.username || 'You', displayName: user?.displayName || 'Operator', avatar: user?.avatar || '👤' }]).slice(0, 5).map((u, i) => (
              <View
                key={u.id}
                style={[
                  styles.stackAvatar,
                  i > 0 && { marginLeft: -10 },
                  { zIndex: 10 - i },
                ]}
              >
                <Text style={{ fontSize: 15 }}>
                  {u.avatar || (u.id === user?.id ? '👤' : '👨🏽‍💻')}
                </Text>
              </View>
            ))}
            {activeUsers && activeUsers.length > 5 && (
              <View style={[styles.stackAvatar, styles.moreAvatar, { marginLeft: -10, zIndex: 1 }]}>
                <Text style={styles.moreAvatarText}>+{activeUsers.length - 5}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* ─── Hero Push-to-Talk Centerpiece ─────────────────────────── */}
        <View style={styles.centerPttArea}>
          <AcousticRaysButton
            status={buttonState}
            speaker={activeSpeaker}
            remainingSeconds={remainingSeconds}
            onPressIn={handlePttPressIn}
            onPressOut={handlePttPressOut}
          />
        </View>

        {/* ─── Secondary Controls (Speaker & Mute) ────────────────────── */}
        <View style={styles.secondaryControlsRow}>
          <Pressable onPress={toggleSpeaker} style={styles.circularControl}>
            <View
              style={[
                styles.controlIconCircle,
                isSpeakerOn && styles.controlIconActive,
              ]}
            >
              <Text style={{ fontSize: 20 }}>🔊</Text>
            </View>
            <Text style={styles.controlText}>Speaker</Text>
          </Pressable>

          <Pressable onPress={toggleMute} style={styles.circularControl}>
            <View
              style={[
                styles.controlIconCircle,
                isMuted && styles.controlIconActive,
              ]}
            >
              <Text style={{ fontSize: 20 }}>{isMuted ? '🔇' : '🎙️'}</Text>
            </View>
            <Text style={styles.controlText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </Pressable>
        </View>

        {/* ─── Listening Waveform Pill ───────────────────────────────── */}
        <View style={styles.bottomListeningArea}>
          <ListeningPill
            isSpeaking={isTalking || isBusy}
            speakerName={activeSpeaker?.displayName}
          />
        </View>

        {/* ─── Full-Screen Live Transmission Modal ──────────────────── */}
        <LiveTransmissionModal
          visible={showLiveModal}
          channelName={activeChannelTitle}
          onlineCount={userCount || 12}
          remainingSeconds={remainingSeconds}
          isTalking={isTalking}
          isSpeakerOn={isSpeakerOn}
          isMuted={isMuted}
          activeUsers={activeUsers}
          activeSpeaker={activeSpeaker}
          onClose={() => setShowLiveModal(false)}
          onToggleSpeaker={toggleSpeaker}
          onToggleMute={toggleMute}
          onEndCall={() => {
            releaseTalk(activeFreqDisplay);
            setShowLiveModal(false);
          }}
        />
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
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: 20,
    color: '#FF7A00',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlinePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  avatarButton: {
    position: 'relative',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161C26',
    borderWidth: 1.5,
    borderColor: '#242C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#0B0E14',
  },
  channelCard: {
    backgroundColor: '#151A24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242C3C',
    padding: 16,
    marginTop: 4,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  channelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalBars: {
    fontSize: 14,
    color: '#22C55E',
  },
  channelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gearButton: {
    padding: 4,
  },
  gearIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  channelSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  channelSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2533',
    borderWidth: 2,
    borderColor: '#151A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatar: {
    backgroundColor: '#252F42',
  },
  moreAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerPttArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  secondaryControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  circularControl: {
    alignItems: 'center',
    gap: 6,
  },
  controlIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#151A24',
    borderWidth: 1,
    borderColor: '#242C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconActive: {
    borderColor: '#FF7A00',
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  controlText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  bottomListeningArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});
