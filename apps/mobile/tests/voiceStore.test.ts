import { describe, it, expect, beforeEach } from 'vitest';
import { useVoiceStore } from '../src/features/voice/store/voiceStore';

describe('Phase 6 Mobile Voice Store', () => {
  beforeEach(() => {
    useVoiceStore.setState({
      voiceStatus: 'NEW',
      microphonePermission: 'undetermined',
      isMicrophoneActive: false,
      activeFrequency: null,
      remotePeers: [],
      audioOutput: 'speaker',
      lastError: null,
    });
  });

  it('should initialize with default voice states', () => {
    const state = useVoiceStore.getState();
    expect(state.voiceStatus).toBe('NEW');
    expect(state.isMicrophoneActive).toBe(false);
    expect(state.audioOutput).toBe('speaker');
    expect(state.remotePeers.length).toBe(0);
  });

  it('should toggle audio output route between speaker and earpiece', async () => {
    expect(useVoiceStore.getState().audioOutput).toBe('speaker');

    await useVoiceStore.getState().toggleAudioOutput();
    expect(useVoiceStore.getState().audioOutput).toBe('earpiece');

    await useVoiceStore.getState().toggleAudioOutput();
    expect(useVoiceStore.getState().audioOutput).toBe('speaker');
  });

  it('should stop microphone and update state', () => {
    useVoiceStore.setState({ isMicrophoneActive: true });
    expect(useVoiceStore.getState().isMicrophoneActive).toBe(true);

    useVoiceStore.getState().stopMicrophone();
    expect(useVoiceStore.getState().isMicrophoneActive).toBe(false);
  });

  it('should handle leaveVoiceSession and reset active session properties', () => {
    useVoiceStore.setState({
      voiceStatus: 'CONNECTED',
      activeFrequency: '145.800',
      isMicrophoneActive: true,
      remotePeers: [
        { peerId: 'usr_remote_1', username: 'remote1', displayName: 'Remote 1', isAudioActive: true },
      ],
    });

    useVoiceStore.getState().leaveVoiceSession();

    const state = useVoiceStore.getState();
    expect(state.voiceStatus).toBe('CLOSED');
    expect(state.isMicrophoneActive).toBe(false);
    expect(state.activeFrequency).toBeNull();
    expect(state.remotePeers.length).toBe(0);
  });
});
