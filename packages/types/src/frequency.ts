import type { UserSummary, UserPresenceStatus } from './user';

export type FrequencyStatus =
  | 'AVAILABLE'
  | 'FULL'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export type FrequencyMembershipStatus = 'ACTIVE' | 'LEFT' | 'MUTED';

export interface VirtualFrequency {
  id: string;
  frequencyCode: string; // e.g. "145.800"
  name?: string | null;
  maxUsers: number; // Hard max: 40
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string | null;
}

export interface FrequencyMembership {
  id: string;
  userId: string;
  frequencyId: string;
  joinedAt: string;
  lastSeenAt: string;
  status: FrequencyMembershipStatus;
}

export interface FrequencyStateResponse {
  frequencyCode: string;
  name?: string | null;
  maxUsers: number;
  userCount: number;
  status: FrequencyStatus;
  isJoined?: boolean;
}

export interface JoinFrequencyResponse {
  frequencyCode: string;
  joined: boolean;
  userCount: number;
  maxUsers: number;
  status: FrequencyStatus;
}

export interface LeaveFrequencyResponse {
  frequencyCode: string;
  left: boolean;
  userCount: number;
  maxUsers: number;
}

export interface FrequencyUserSummary {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  status: UserPresenceStatus;
  isOnline: boolean;
  joinedAt?: string;
}

export interface FrequencyState {
  frequencyCode: string;
  name?: string | null;
  maxUsers: number;
  activeUsersCount: number;
  activeSpeakerId: string | null;
  users: UserSummary[];
}
