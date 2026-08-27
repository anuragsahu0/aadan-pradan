import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';

export interface LiveTransmissionModalProps {
  visible: boolean;
  channelName: string;
  onlineCount: number;
  remainingSeconds: number;
  isTalking: boolean;
  isSpeakerOn: boolean;
  isMuted: boolean;
  activeUsers?: any[];
  activeSpeaker?: any;
  onClose: () => void;
  onToggleSpeaker: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const LiveTransmissionModal: React.FC<LiveTransmissionModalProps> = ({
  visible,
  channelName,
  onlineCount,
  remainingSeconds,
  isTalking,
  isSpeakerOn,
  isMuted,
  activeUsers,
  activeSpeaker,
  onClose,
  onToggleSpeaker,
  onToggleMute,
  onEndCall,
}) => {
  // Waveform bars animation
  const barCount = 15;
  const animBars = useRef(
    Array.from({ length: barCount }).map(() => new Animated.Value(10))
  ).current;

  useEffect(() => {
    if (visible) {
      const loops = animBars.map((anim, i) => {
        const min = 8 + (i % 3) * 4;
        const max = 35 + ((i * 7) % 30);
        const duration = 200 + ((i * 50) % 250);
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
            Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
          ])
        );
      });

      loops.forEach((l) => l.start());
      return () => {
        loops.forEach((l) => l.stop());
      };
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <Text style={styles.headerIcon}>⌄</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{channelName}</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.onlineText}>{onlineCount} Online</Text>
            </View>
          </View>
          <Pressable style={styles.iconBtn}>
            <Text style={styles.headerIcon}>•••</Text>
          </Pressable>
        </View>

        {/* Operator Avatars Row (Only real connected operators) */}
        <View style={styles.avatarsRow}>
          {(activeUsers && activeUsers.length > 0
            ? activeUsers
            : [{ id: 'me', displayName: 'You', avatar: '👤' }]
          ).slice(0, 5).map((u) => {
            const isSpeakingNow = activeSpeaker?.id === u.id || (isTalking && u.displayName === 'You');
            return (
              <View key={u.id} style={styles.avatarItem}>
                <View style={[styles.avatarCircle, isSpeakingNow && styles.avatarActive]}>
                  <Text style={styles.avatarText}>{u.avatar || '👤'}</Text>
                  {isSpeakingNow && (
                    <View style={styles.micBadge}>
                      <Text style={{ fontSize: 9 }}>🟢</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.avatarName}>
                  {u.displayName?.split(' ')[0] || u.username || 'Operator'}
                </Text>
              </View>
            );
          })}
          {activeUsers && activeUsers.length > 5 && (
            <View style={styles.avatarItem}>
              <View style={[styles.avatarCircle, styles.moreCircle]}>
                <Text style={styles.moreText}>+{activeUsers.length - 5}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Big Neon Green Circular Oscilloscope Visualizer */}
        <View style={styles.oscilloscopeSection}>
          <View style={styles.greenCircle}>
            {/* Waveform graphic */}
            <View style={styles.wavesBox}>
              {animBars.map((val, idx) => (
                <Animated.View
                  key={idx}
                  style={[styles.oscilloBar, { height: val }]}
                />
              ))}
            </View>
            <Text style={styles.liveTag}>LIVE</Text>
            <Text style={styles.liveTagSub}>VOICE STREAM</Text>
          </View>
          <Text style={styles.talkingStatus}>
            {isTalking ? 'Transmitting Live' : `${activeSpeaker?.displayName || 'Operator'} is Speaking`}
          </Text>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsRow}>
          <Pressable onPress={onToggleSpeaker} style={styles.controlItem}>
            <View style={[styles.controlCircle, isSpeakerOn && styles.controlActive]}>
              <Text style={styles.controlEmoji}>🔊</Text>
            </View>
            <Text style={styles.controlLabel}>Speaker</Text>
          </Pressable>

          <Pressable onPress={onEndCall} style={styles.endCallItem}>
            <View style={styles.endCallCircle}>
              <Text style={styles.endCallEmoji}>📞</Text>
            </View>
            <Text style={styles.endCallLabel}>End</Text>
          </Pressable>

          <Pressable onPress={onToggleMute} style={styles.controlItem}>
            <View style={[styles.controlCircle, isMuted && styles.controlActive]}>
              <Text style={styles.controlEmoji}>{isMuted ? '🔇' : '🎙️'}</Text>
            </View>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </Pressable>
        </View>

        {/* Real-time Channel Activity */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Channel Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.smallAvatar}>
                <Text style={{ fontSize: 13 }}>🎙️</Text>
              </View>
              <Text style={styles.activityText}>
                {isTalking
                  ? 'You are transmitting live'
                  : activeSpeaker
                  ? `${activeSpeaker.displayName || 'Operator'} is talking`
                  : 'Channel floor idle • Press to talk'}
              </Text>
              <Text style={{ color: '#22C55E', marginLeft: 'auto' }}>📶</Text>
            </View>
            <View style={styles.activityRow}>
              <View style={styles.smallAvatar}>
                <Text style={{ fontSize: 13 }}>👥</Text>
              </View>
              <Text style={styles.activityText}>
                {activeUsers?.length || onlineCount || 1} Connected Operator{(activeUsers?.length || onlineCount || 1) === 1 ? '' : 's'}
              </Text>
              <Text style={styles.activityTime}>Live</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151A24',
  },
  headerIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 12,
  },
  avatarItem: {
    alignItems: 'center',
    gap: 6,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C2330',
    borderWidth: 2,
    borderColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarActive: {
    borderColor: '#22C55E',
  },
  avatarText: {
    fontSize: 24,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  micBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0B0E14',
    borderRadius: 6,
    padding: 1,
  },
  moreCircle: {
    backgroundColor: '#151A24',
    borderColor: '#2A3444',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  oscilloscopeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  greenCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: '#22C55E',
    backgroundColor: '#0D1914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
  },
  wavesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 70,
    marginBottom: 8,
  },
  oscilloBar: {
    width: 3.5,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  liveTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveTagSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E9BAE',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  talkingStatus: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22C55E',
    marginTop: 16,
    letterSpacing: 0.8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  controlItem: {
    alignItems: 'center',
    gap: 8,
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#151A24',
    borderWidth: 1,
    borderColor: '#242C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: {
    borderColor: '#FF7A00',
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
  },
  controlEmoji: {
    fontSize: 22,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  endCallItem: {
    alignItems: 'center',
    gap: 8,
  },
  endCallCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  endCallEmoji: {
    fontSize: 26,
    color: '#FFFFFF',
    transform: [{ rotate: '135deg' }],
  },
  endCallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  recentSection: {
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  activityCard: {
    backgroundColor: '#151A24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242C3C',
    padding: 12,
    gap: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  activityTime: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 'auto',
  },
});
