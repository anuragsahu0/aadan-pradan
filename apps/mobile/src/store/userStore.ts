import { create } from 'zustand';
import type { User, UserPresenceStatus } from '@aadan-pradan/types';

export interface UserStats {
  frequenciesJoined: number;
  talkTimeFormatted: string;
  transmissionsCount: number;
  floorPriority: string;
}

interface UserState {
  currentUser: User;
  status: UserPresenceStatus;
  callsign: string;
  stats: UserStats;
  setUser: (user: User) => void;
  setStatus: (status: UserPresenceStatus) => void;
  setCallsign: (callsign: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: {
    id: 'usr_anurag_01',
    username: 'anurag',
    displayName: 'Anurag Sahu',
    email: 'anurag@aadanpradan.io',
    role: 'USER',
    status: 'ACTIVE',
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  status: 'online',
  callsign: 'ALPHA-01',
  stats: {
    frequenciesJoined: 42,
    talkTimeFormatted: '--',
    transmissionsCount: 128,
    floorPriority: 'Standard',
  },
  setUser: (currentUser) => set({ currentUser }),
  setStatus: (status) => set({ status }),
  setCallsign: (callsign) => set({ callsign }),
}));
