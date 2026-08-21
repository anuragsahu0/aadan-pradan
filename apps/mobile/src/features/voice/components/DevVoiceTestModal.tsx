import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../theme';
import { useVoiceStore } from '../store/voiceStore';
import { Badge } from '../../../components/common/Badge';

export interface DevVoiceTestModalProps {
  visible: boolean;
  frequencyCode: string;
  onClose: () => void;
}

export const DevVoiceTestModal: React.FC<DevVoiceTestModalProps> = ({
  visible,
  frequencyCode,
  onClose,
}) => {
  const { colors, typography, spacing, radii } = useTheme();
  const {
    voiceStatus,
    microphonePermission,
    isMicrophoneActive,
    remotePeers,
    audioOutput,
    lastError,
    startVoiceSession,
    leaveVoiceSession,
    startMicrophone,
    stopMicrophone,
    toggleAudioOutput,
    clearError,
  } = useVoiceStore();

  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (visible && frequencyCode) {
      setInitializing(true);
      startVoiceSession(frequencyCode).finally(() => setInitializing(false));
    } else {
      leaveVoiceSession();
    }
  }, [visible, frequencyCode]);

  const handleToggleMic = async () => {
    if (isMicrophoneActive) {
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.xl,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.md, fontWeight: '800' }}>
                🎙️ WebRTC Voice Test
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xxs, marginTop: 2 }}>
                PHASE 6 REAL-TIME AUDIO VERIFICATION • {frequencyCode}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Connection Status Banner */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.sm,
              borderRadius: radii.md,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
              WEBRTC ENGINE
            </Text>
            <Badge
              label={initializing ? 'CONNECTING...' : voiceStatus}
              variant={
                voiceStatus === 'CONNECTED'
                  ? 'emerald'
                  : voiceStatus === 'CONNECTING' || initializing
                  ? 'amber'
                  : 'crimson'
              }
              dot={voiceStatus === 'CONNECTED'}
            />
          </View>

          {lastError && (
            <View
              style={{
                backgroundColor: colors.crimsonMuted,
                borderColor: colors.crimson,
                borderWidth: 1,
                padding: spacing.sm,
                borderRadius: radii.md,
              }}
            >
              <Text style={{ color: colors.crimson, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                ⚠️ {lastError}
              </Text>
            </View>
          )}

          {/* Remote Audio Peers */}
          <View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
                marginBottom: spacing.xs,
              }}
            >
              CONNECTED VOICE PEERS ({remotePeers.length})
            </Text>
            {remotePeers.length === 0 ? (
              <View
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: radii.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, textAlign: 'center' }}>
                  No other voice participants on {frequencyCode}. Open this frequency on Device B to test 2-way live audio.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 120 }}>
                {remotePeers.map((peer) => (
                  <View
                    key={peer.peerId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: spacing.xs,
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: radii.sm,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                      🔊 {peer.displayName} (@{peer.username})
                    </Text>
                    <Badge label="AUDIO ACTIVE" variant="emerald" dot />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Microphone Transmission Control */}
          <TouchableOpacity
            onPress={handleToggleMic}
            disabled={initializing}
            style={{
              backgroundColor: isMicrophoneActive ? colors.emerald : colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: isMicrophoneActive ? colors.emerald : colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#000000', fontSize: typography.fontSize.sm, fontWeight: '900', letterSpacing: 1 }}>
              {isMicrophoneActive ? '🔴 MICROPHONE ACTIVE (TRANSMITTING)' : '🎙️ ENABLE MICROPHONE (VOICE TEST)'}
            </Text>
          </TouchableOpacity>

          {/* Audio Output Router Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
              OUTPUT: {audioOutput.toUpperCase()}
            </Text>
            <TouchableOpacity
              onPress={toggleAudioOutput}
              style={{
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderWidth: 1,
                paddingVertical: 4,
                paddingHorizontal: spacing.sm,
                borderRadius: radii.sm,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: typography.fontSize.xxs, fontWeight: '700' }}>
                Switch to {audioOutput === 'speaker' ? 'Earpiece' : 'Speaker'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderWidth: 1,
              paddingVertical: spacing.sm,
              borderRadius: radii.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, fontWeight: '800' }}>
              CLOSE TEST
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
