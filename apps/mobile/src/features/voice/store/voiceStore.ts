import { create } from 'zustand';
import type {
  VoiceConnectionState,
  MicrophonePermissionStatus,
  AudioOutputRoute,
  VoicePeer,
} from '../types/voice.types';
import { permissionService } from '../services/permissionService';
import { audioOutputManager } from '../services/audioOutputManager';
import { signalingService } from '../services/signaling.service';
import { webrtcService } from '../services/webrtc.service';

interface VoiceState {
  voiceStatus: VoiceConnectionState;
  microphonePermission: MicrophonePermissionStatus;
  isMicrophoneActive: boolean;
  activeFrequency: string | null;
  remotePeers: VoicePeer[];
  audioOutput: AudioOutputRoute;
  lastError: string | null;

  // Actions
  checkPermission: () => Promise<MicrophonePermissionStatus>;
  requestPermission: () => Promise<boolean>;
  startVoiceSession: (frequencyCode: string) => Promise<boolean>;
  leaveVoiceSession: () => void;
  startMicrophone: () => Promise<boolean>;
  stopMicrophone: () => void;
  toggleAudioOutput: () => Promise<void>;
  clearError: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voiceStatus: 'NEW',
  microphonePermission: 'undetermined',
  isMicrophoneActive: false,
  activeFrequency: null,
  remotePeers: [],
  audioOutput: 'speaker',
  lastError: null,

  checkPermission: async () => {
    const status = await permissionService.checkMicrophonePermission();
    set({ microphonePermission: status });
    return status;
  },

  requestPermission: async () => {
    const status = await permissionService.requestMicrophonePermission();
    set({ microphonePermission: status });
    return status === 'granted';
  },

  startVoiceSession: async (frequencyCode: string) => {
    set({ voiceStatus: 'CONNECTING', activeFrequency: frequencyCode, lastError: null });

    // Initialize audio mode (speakerphone)
    await audioOutputManager.initializeAudioMode();

    // 1. Join Signaling Session
    const signalRes = await signalingService.joinVoiceSession(frequencyCode);
    if (!signalRes.success) {
      set({
        voiceStatus: 'FAILED',
        lastError: signalRes.error || 'Failed to initialize voice session',
      });
      return false;
    }

    const iceServers = signalRes.config?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];

    // 2. Initialize WebRTC Session
    webrtcService.setCallbacks({
      onConnectionStateChange: (voiceStatus) => set({ voiceStatus }),
      onRemoteStream: (peerId, _stream) => {
        const peers = get().remotePeers;
        if (!peers.some((p) => p.peerId === peerId)) {
          set({
            remotePeers: [
              ...peers,
              { peerId, username: 'operator', displayName: 'Remote Operator', isAudioActive: true },
            ],
          });
        }
      },
      onPeerLeft: (peerId) => {
        set({ remotePeers: get().remotePeers.filter((p) => p.peerId !== peerId) });
      },
      onError: (lastError) => set({ lastError, voiceStatus: 'FAILED' }),
    });

    await webrtcService.initSession(
      frequencyCode,
      iceServers,
      (signalRes.config as any)?.existingPeerIds
    );
    set({ voiceStatus: 'CONNECTED' });
    return true;
  },

  leaveVoiceSession: () => {
    webrtcService.closeSession();
    set({
      voiceStatus: 'CLOSED',
      isMicrophoneActive: false,
      activeFrequency: null,
      remotePeers: [],
    });
  },

  startMicrophone: async () => {
    let perm = get().microphonePermission;
    if (perm !== 'granted') {
      const granted = await get().requestPermission();
      if (!granted) {
        set({ lastError: 'Microphone permission is required for voice transmission.' });
        return false;
      }
    }

    const stream = await webrtcService.startLocalAudio();
    if (stream) {
      set({ isMicrophoneActive: true, lastError: null });
      return true;
    } else {
      set({ isMicrophoneActive: false, lastError: 'Could not capture microphone audio.' });
      return false;
    }
  },

  stopMicrophone: () => {
    webrtcService.stopLocalAudio();
    set({ isMicrophoneActive: false });
  },

  toggleAudioOutput: async () => {
    const nextRoute: AudioOutputRoute = get().audioOutput === 'speaker' ? 'earpiece' : 'speaker';
    await audioOutputManager.setSpeakerphoneOn(nextRoute === 'speaker');
    set({ audioOutput: nextRoute });
  },

  clearError: () => set({ lastError: null }),
}));
