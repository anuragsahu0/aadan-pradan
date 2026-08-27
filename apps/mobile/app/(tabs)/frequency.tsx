import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { FrequencyDisplay } from '../../src/components/common/FrequencyDisplay';
import { ActiveSpeakerCard } from '../../src/components/frequency/ActiveSpeakerCard';
import { PushToTalkButton } from '../../src/components/frequency/PushToTalkButton';
import { ActiveUsersList } from '../../src/components/frequency/ActiveUsersList';
import { FrequencyTuner } from '../../src/components/frequency/FrequencyTuner';
import { DevVoiceTestModal } from '../../src/features/voice/components/DevVoiceTestModal';
import { MicrophonePermissionModal } from '../../src/features/voice/components/MicrophonePermissionModal';
import { useFrequencyStore } from '../../src/store/frequencyStore';
import { useUserStore } from '../../src/store/userStore';
import { useVoiceStore } from '../../src/features/voice/store/voiceStore';
import { usePttStore } from '../../src/features/voice/store/pttStore';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import { hapticFeedback } from '../../src/utils/haptics';

export default function FrequencyScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();

  const {
    currentFrequencyCode,
    channelName,
    connectionStatus,
    userCount,
    activeUsers,
    errorMessage,
    connectToFrequency,
  } = useFrequencyStore();

  const { currentUser, callsign } = useUserStore();
  const { voiceStatus } = useVoiceStore();
  const {
    buttonState,
    activeSpeaker,
    isTalking,
    remainingSeconds,
    lastError: pttError,
    requestTalk,
    releaseTalk,
    resetPtt,
  } = usePttStore();

  const [showVoiceTestModal, setShowVoiceTestModal] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);

  useEffect(() => {
    connectToFrequency(currentFrequencyCode).catch(() => {});
    resetPtt();
  }, [currentFrequencyCode]);

  const handleTuneFrequency = (freq: string) => {
    hapticFeedback.light();
    releaseTalk(currentFrequencyCode);
    connectToFrequency(freq).catch(() => {});
  };

  const handlePttPressIn = async () => {
    await requestTalk(currentFrequencyCode);
  };

  const handlePttPressOut = () => {
    releaseTalk(currentFrequencyCode);
  };

  const isChannelDisabled =
    connectionStatus === 'DISCONNECTED' ||
    connectionStatus === 'ERROR' ||
    connectionStatus === 'FULL';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {/* Top Header */}
        <AppHeader
          title="VIRTUAL WALKIE-TALKIE"
          showBrand
          onBack={() => {
            releaseTalk(currentFrequencyCode);
            router.push('/(tabs)');
          }}
          statusBadge={connectionStatus}
          statusVariant={
            connectionStatus === 'CONNECTED'
              ? 'emerald'
              : connectionStatus === 'FULL'
              ? 'crimson'
              : connectionStatus === 'CONNECTING'
              ? 'amber'
              : 'neutral'
          }
        />

        {/* Capacity or PTT Error Banner */}
        {(errorMessage || pttError) && !errorMessage?.toLowerCase().includes('token') && (
          <View
            style={{
              backgroundColor: colors.crimsonMuted,
              borderColor: colors.crimson,
              borderWidth: 1,
              borderRadius: radii.md,
              padding: spacing.sm,
            }}
          >
            <Text style={{ color: colors.crimson, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
              ⚠️ {errorMessage || pttError}
            </Text>
          </View>
        )}

        {/* Retro-Digital LCD Virtual Frequency Readout */}
        <FrequencyDisplay
          frequencyCode={currentFrequencyCode}
          channelName={channelName}
          status={connectionStatus}
          userCount={activeUsers.length || userCount}
          maxUsers={MAX_USERS_PER_FREQUENCY}
          isTransmitting={isTalking}
        />

        {/* Preset Channel Tuner Bar */}
        <FrequencyTuner
          currentFrequency={currentFrequencyCode}
          onSelectFrequency={handleTuneFrequency}
        />

        {/* Live Active Speaker Card (Phase 7 Floor Display with "CHANNEL CLEAR" state) */}
        <ActiveSpeakerCard
          speaker={
            isTalking
              ? {
                  id: currentUser.id,
                  username: currentUser.username,
                  displayName: currentUser.displayName,
                  avatar: currentUser.avatar,
                  status: 'speaking',
                }
              : activeSpeaker
              ? {
                  id: activeSpeaker.id,
                  username: activeSpeaker.username,
                  displayName: activeSpeaker.displayName,
                  avatar: activeSpeaker.avatar,
                  status: 'speaking',
                }
              : null
          }
          isTransmitting={isTalking}
        />

        {/* Real Push-to-Talk Button (Phase 7 Floor Arbitration) */}
        <PushToTalkButton
          status={isChannelDisabled ? 'disabled' : buttonState}
          speaker={activeSpeaker}
          remainingSeconds={remainingSeconds}
          disabled={isChannelDisabled}
          onPressIn={handlePttPressIn}
          onPressOut={handlePttPressOut}
        />

        {/* WebRTC Voice & Mic Status Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginVertical: spacing.xxs }}>
          <TouchableOpacity
            onPress={() => setShowVoiceTestModal(true)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceElevated,
              borderColor: voiceStatus === 'CONNECTED' ? colors.emerald : colors.primary,
              borderWidth: 1.5,
              paddingVertical: 8,
              paddingHorizontal: spacing.md,
              borderRadius: radii.full,
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 12 }}>🎙️</Text>
            <Text
              style={{
                color: voiceStatus === 'CONNECTED' ? colors.emerald : colors.primary,
                fontSize: typography.fontSize.xs,
                fontWeight: '800',
              }}
            >
              {voiceStatus === 'CONNECTED' ? '● Voice Connected (Test)' : 'WebRTC Diagnostics'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowMicModal(true)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderWidth: 1,
              paddingVertical: 8,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.full,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>ℹ️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
              Mic Info
            </Text>
          </TouchableOpacity>
        </View>

        {/* 40-User Virtualized Capacity List */}
        <ActiveUsersList
          users={activeUsers}
          maxUsers={MAX_USERS_PER_FREQUENCY}
          activeSpeakerId={isTalking ? currentUser.id : activeSpeaker?.id}
        />

        {/* Operator Callout Footer */}
        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 4,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
              fontWeight: '700',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            ACTIVE CALLSIGN: <Text style={{ color: colors.primary }}>{callsign}</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center' }}>
            Aadan Pradan Virtual Frequency Network • 40 Users Maximum per Channel
          </Text>
        </View>
      </ScrollView>

      {/* Dev Voice Test Modal */}
      <DevVoiceTestModal
        visible={showVoiceTestModal}
        frequencyCode={currentFrequencyCode}
        onClose={() => setShowVoiceTestModal(false)}
      />

      {/* Microphone Safety & Permission Modal */}
      <MicrophonePermissionModal
        visible={showMicModal}
        onGrant={() => {
          setShowMicModal(false);
          hapticFeedback.success();
        }}
        onDismiss={() => setShowMicModal(false)}
      />
    </SafeAreaView>
  );
}
