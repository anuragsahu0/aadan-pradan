import { useEffect, useCallback } from 'react';
import { useVoiceStore } from '../store/voiceStore';

export function useVoiceConnection(frequencyCode?: string) {
  const {
    voiceStatus,
    microphonePermission,
    isMicrophoneActive,
    remotePeers,
    audioOutput,
    lastError,
    checkPermission,
    requestPermission,
    startVoiceSession,
    leaveVoiceSession,
    startMicrophone,
    stopMicrophone,
    toggleAudioOutput,
    clearError,
  } = useVoiceStore();

  useEffect(() => {
    // Check initial permission status silently
    checkPermission().catch(() => {});
  }, [checkPermission]);

  const connectVoice = useCallback(async () => {
    if (frequencyCode) {
      return startVoiceSession(frequencyCode);
    }
    return false;
  }, [frequencyCode, startVoiceSession]);

  const disconnectVoice = useCallback(() => {
    leaveVoiceSession();
  }, [leaveVoiceSession]);

  return {
    voiceStatus,
    microphonePermission,
    isMicrophoneActive,
    remotePeers,
    audioOutput,
    lastError,
    connectVoice,
    disconnectVoice,
    requestPermission,
    startMicrophone,
    stopMicrophone,
    toggleAudioOutput,
    clearError,
  };
}
