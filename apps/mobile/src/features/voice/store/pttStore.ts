import { create } from 'zustand';
import type {
  PttButtonState,
  PttSpeakerInfo,
  PttStatePayload,
  PttGrantedPayload,
  PttDeniedPayload,
  PttReleasedPayload,
} from '@aadan-pradan/types';
import { MAX_TALK_DURATION_MS } from '@aadan-pradan/config';
import { socketManager } from '../../../services/socket/socketManager';
import { webrtcService } from '../services/webrtc.service';
import { useAuthStore } from '../../../store/authStore';
import { hapticFeedback } from '../../../utils/haptics';

interface PttState {
  buttonState: PttButtonState;
  activeSpeaker: PttSpeakerInfo | null;
  isTalking: boolean;
  isBusy: boolean;
  expiresAt: number | null;
  remainingSeconds: number;
  lastError: string | null;

  // Actions
  requestTalk: (frequencyCode: string) => Promise<boolean>;
  releaseTalk: (frequencyCode: string) => void;
  setPttState: (state: PttStatePayload) => void;
  resetPtt: () => void;
  clearError: () => void;
}

let countdownInterval: ReturnType<typeof setInterval> | null = null;
let listenersInitialized = false;

export const usePttStore = create<PttState>((set, get) => ({
  buttonState: 'idle',
  activeSpeaker: null,
  isTalking: false,
  isBusy: false,
  expiresAt: null,
  remainingSeconds: Math.floor(MAX_TALK_DURATION_MS / 1000),
  lastError: null,

  requestTalk: async (frequencyCode: string): Promise<boolean> => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) {
      set({ buttonState: 'error', lastError: 'Authentication required to transmit' });
      return false;
    }

    if (get().isBusy && get().activeSpeaker?.id !== currentUserId) {
      hapticFeedback.error();
      return false;
    }

    set({ buttonState: 'requesting', lastError: null });

    // Initialize socket listeners if not already done
    ensureSocketListeners();

    // Prepare audio track (unlock mobile audio context & capture microphone)
    webrtcService.unlockAudioContext();
    await webrtcService.startLocalAudio();

    const socket = socketManager.connect();
    if (!socket) {
      set({ buttonState: 'error', lastError: 'Socket disconnected' });
      return false;
    }

    return new Promise((resolve) => {
      socket.emit('ptt:request', { frequencyCode }, (res) => {
        if (res && !res.granted) {
          hapticFeedback.error();
          webrtcService.setAudioTransmission(false);
          set({
            buttonState: res.error?.includes('busy') ? 'busy' : 'error',
            lastError: res.error || 'Channel floor busy',
            isTalking: false,
          });
          resolve(false);
        } else {
          webrtcService.setAudioTransmission(true);
          set({
            isTalking: true,
            buttonState: 'talking',
          });
          resolve(true);
        }
      });
    });
  },

  releaseTalk: (frequencyCode: string) => {
    webrtcService.setAudioTransmission(false);
    if (get().isTalking || get().buttonState === 'talking') {
      hapticFeedback.light();

      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      const socket = socketManager.connect();
      if (socket) {
        socket.emit('ptt:release', { frequencyCode });
      }

      set({
        isTalking: false,
        buttonState: get().activeSpeaker ? 'busy' : 'idle',
        remainingSeconds: Math.floor(MAX_TALK_DURATION_MS / 1000),
      });
    } else if (get().buttonState === 'requesting') {
      set({ buttonState: get().activeSpeaker ? 'busy' : 'idle' });
    }
  },

  setPttState: (state: PttStatePayload) => {
    const currentUserId = useAuthStore.getState().user?.id;

    if (state.state === 'ACTIVE' && state.speaker) {
      const isSelf = state.speaker.id === currentUserId;
      webrtcService.setAudioTransmission(isSelf);
      set({
        activeSpeaker: state.speaker,
        isBusy: !isSelf,
        isTalking: isSelf,
        buttonState: isSelf ? 'talking' : 'busy',
        expiresAt: state.expiresAt || null,
      });

      if (isSelf && state.expiresAt) {
        startCountdown(state.expiresAt);
      }
    } else {
      webrtcService.setAudioTransmission(false);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      set({
        activeSpeaker: null,
        isBusy: false,
        isTalking: false,
        buttonState: 'idle',
        expiresAt: null,
        remainingSeconds: Math.floor(MAX_TALK_DURATION_MS / 1000),
      });
    }
  },

  resetPtt: () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    webrtcService.setAudioTransmission(false);
    set({
      buttonState: 'idle',
      activeSpeaker: null,
      isTalking: false,
      isBusy: false,
      expiresAt: null,
      remainingSeconds: Math.floor(MAX_TALK_DURATION_MS / 1000),
      lastError: null,
    });
  },

  clearError: () => set({ lastError: null }),
}));

function startCountdown(expiresAt: number) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const update = () => {
    const msRemaining = expiresAt - Date.now();
    const sec = Math.max(0, Math.ceil(msRemaining / 1000));
    usePttStore.setState({ remainingSeconds: sec });

    if (sec <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      usePttStore.getState().releaseTalk(usePttStore.getState().activeSpeaker?.id || '');
    }
  };

  update();
  countdownInterval = setInterval(update, 1000);
}

function ensureSocketListeners() {
  if (listenersInitialized) return;
  const socket = socketManager.connect();
  if (!socket) return;

  listenersInitialized = true;

  socket.on('ptt:granted', (payload: PttGrantedPayload) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (payload.speaker.id === currentUserId) {
      hapticFeedback.medium();
      webrtcService.setAudioTransmission(true);
      usePttStore.setState({
        buttonState: 'talking',
        isTalking: true,
        activeSpeaker: payload.speaker,
        expiresAt: payload.expiresAt,
      });
      startCountdown(payload.expiresAt);
    } else {
      usePttStore.setState({
        buttonState: 'busy',
        isBusy: true,
        activeSpeaker: payload.speaker,
        expiresAt: payload.expiresAt,
      });
    }
  });

  socket.on('ptt:denied', (payload: PttDeniedPayload) => {
    hapticFeedback.error();
    webrtcService.setAudioTransmission(false);
    usePttStore.setState({
      buttonState: payload.code === 'CHANNEL_BUSY' ? 'busy' : 'error',
      isTalking: false,
      lastError: payload.message || 'Floor request denied',
    });
  });

  socket.on('ptt:released', () => {
    webrtcService.setAudioTransmission(false);
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    usePttStore.setState({
      buttonState: 'idle',
      isTalking: false,
      isBusy: false,
      activeSpeaker: null,
      remainingSeconds: Math.floor(MAX_TALK_DURATION_MS / 1000),
    });
  });

  socket.on('ptt:state', (payload: PttStatePayload) => {
    usePttStore.getState().setPttState(payload);
  });
}
