import { create } from 'zustand';
import type { UserSummary, FrequencyStatus } from '@aadan-pradan/types';
import { DEFAULT_FREQUENCY, MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import { normalizeFrequencyCode, isValidFrequencyCode } from '@aadan-pradan/utils';
import {
  fetchFrequencyDetails,
  joinFrequencyApi,
  leaveFrequencyApi,
  fetchFrequencyUsers,
  fetchRecentFrequencies,
} from '../api/frequencyApi';
import { socketService } from '../services/socketService';
import { useVoiceStore } from '../features/voice/store/voiceStore';
import { useAuthStore } from './authStore';

export type FrequencyConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'BUSY'
  | 'FULL'
  | 'ERROR'
  | 'DISCONNECTED';

interface FrequencyState {
  currentFrequencyCode: string;
  channelName: string;
  userCount: number;
  maxUsers: number;
  connectionStatus: FrequencyConnectionStatus;
  activeUsers: UserSummary[];
  activeSpeaker: UserSummary | null;
  activeSpeakerId: string | null;
  isTransmitting: boolean;
  recentFrequencies: string[];
  errorMessage: string | null;

  // Actions
  setFrequency: (code: string, name?: string) => void;
  setConnectionStatus: (status: FrequencyConnectionStatus) => void;
  setActiveUsers: (users: UserSummary[]) => void;
  setActiveSpeaker: (speaker: UserSummary | null) => void;
  setTransmitting: (isTransmitting: boolean) => void;
  connectToFrequency: (code: string) => Promise<boolean>;
  disconnectFromFrequency: () => Promise<void>;
  loadRecentFrequencies: () => Promise<void>;
  clearError: () => void;
}

export const useFrequencyStore = create<FrequencyState>((set, get) => ({
  currentFrequencyCode: DEFAULT_FREQUENCY,
  channelName: 'PRIMARY CALLING CHANNEL',
  userCount: 1,
  maxUsers: MAX_USERS_PER_FREQUENCY,
  connectionStatus: 'IDLE',
  activeUsers: [],
  activeSpeaker: null,
  activeSpeakerId: null,
  isTransmitting: false,
  recentFrequencies: ['145.800', '146.200', '433.500', '430.000'],
  errorMessage: null,

  setFrequency: (currentFrequencyCode, channelName = 'TACTICAL CHANNEL') => {
    const norm = normalizeFrequencyCode(currentFrequencyCode);
    const recent = get().recentFrequencies.filter((f) => f !== norm);
    set({
      currentFrequencyCode: norm,
      channelName,
      recentFrequencies: [norm, ...recent].slice(0, 8),
    });
  },

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setActiveUsers: (activeUsers) => set({ activeUsers, userCount: activeUsers.length }),
  setActiveSpeaker: (speaker) =>
    set({ activeSpeaker: speaker, activeSpeakerId: speaker?.id || null }),
  setTransmitting: (isTransmitting) => set({ isTransmitting }),
  clearError: () => set({ errorMessage: null }),

  connectToFrequency: async (code: string): Promise<boolean> => {
    if (!isValidFrequencyCode(code)) {
      set({
        connectionStatus: 'ERROR',
        errorMessage: 'Invalid virtual frequency format. Expected XXX.XXX (e.g. 145.800).',
      });
      return false;
    }

    const normalized = normalizeFrequencyCode(code);
    set({
      connectionStatus: 'CONNECTING',
      currentFrequencyCode: normalized,
      errorMessage: null,
    });

    try {
      // 0. Ensure user has a valid operator callsign and token before joining
      if (!useAuthStore.getState().accessToken) {
        await useAuthStore.getState().autoAssignGuest();
      }

      // 1. REST Atomic Join with Hard 40-User Limit
      const joinRes = await joinFrequencyApi(normalized);

      // 2. Fetch live active operators
      const liveUsers = await fetchFrequencyUsers(normalized);

      // Map to UserSummary shape
      const userSummaries: UserSummary[] = liveUsers.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        status: u.status || 'online',
      }));

      // 3. Connect to real-time Socket.IO channel
      await socketService.joinFrequency(normalized, (payload: { frequencyCode: string; count: number; users: UserSummary[] }) => {
        if (payload.frequencyCode === normalized) {
          const mappedUsers: UserSummary[] = (payload.users || []).map((u: UserSummary) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar,
            status: u.status || 'online',
          }));

          set({
            activeUsers: mappedUsers,
            userCount: payload.count || mappedUsers.length,
            connectionStatus: payload.count >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'CONNECTED',
          });
        }
      });

      const recents = get().recentFrequencies.filter((f) => f !== normalized);
      set({
        connectionStatus: joinRes.status === 'FULL' ? 'FULL' : 'CONNECTED',
        currentFrequencyCode: normalized,
        channelName:
          normalized === '145.800'
            ? 'PRIMARY CALLING CHANNEL'
            : `TACTICAL CHANNEL ${normalized}`,
        userCount: joinRes.userCount,
        maxUsers: joinRes.maxUsers || MAX_USERS_PER_FREQUENCY,
        activeUsers: userSummaries,
        recentFrequencies: [normalized, ...recents].slice(0, 8),
        errorMessage: null,
      });

      // 4. Connect WebRTC voice mesh in background for sub-50ms voice transmission
      try {
        useVoiceStore.getState().startVoiceSession(normalized).catch(() => {});
      } catch {
        // Best effort voice initialization
      }

      return true;
    } catch (err: any) {
      // If auth or token error, automatically assign guest and retry seamlessly
      if (err.message?.includes('token') || err.message?.includes('auth') || err.status === 401) {
        try {
          await useAuthStore.getState().autoAssignGuest();
          return await get().connectToFrequency(code);
        } catch {
          // Fall through to error state
        }
      }

      const isFull =
        err.message?.includes('full') ||
        err.message?.includes('capacity') ||
        err.code === 'FREQUENCY_FULL';

      set({
        connectionStatus: isFull ? 'FULL' : 'ERROR',
        errorMessage: isFull
          ? `Virtual frequency ${normalized} has reached maximum capacity of ${MAX_USERS_PER_FREQUENCY} users.`
          : (err.message?.includes('token') ? null : (err.message || 'Failed to connect to virtual frequency.')),
      });

      return false;
    }
  },

  disconnectFromFrequency: async () => {
    const currentCode = get().currentFrequencyCode;
    try {
      await leaveFrequencyApi(currentCode);
      await socketService.leaveFrequency(currentCode);
      useVoiceStore.getState().leaveVoiceSession();
    } catch {
      // Best effort
    } finally {
      set({
        connectionStatus: 'DISCONNECTED',
        activeUsers: [],
        userCount: 0,
      });
    }
  },

  loadRecentFrequencies: async () => {
    try {
      const recents = await fetchRecentFrequencies();
      if (recents.length > 0) {
        set({ recentFrequencies: recents });
      }
    } catch {
      // Keep local defaults
    }
  },
}));
