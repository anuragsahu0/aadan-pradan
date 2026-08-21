import type { UserSummary, UserPresenceStatus } from './user';
import type { FrequencyStatus } from './frequency';
import type {
  VoiceSessionConfig,
  VoiceJoinPayload,
  VoiceLeavePayload,
  VoiceOfferPayload,
  VoiceAnswerPayload,
  VoiceIceCandidatePayload,
  VoicePeerJoinedPayload,
  VoicePeerLeftPayload,
  VoiceErrorPayload,
} from './voice';
import type {
  PttStatePayload,
  PttGrantedPayload,
  PttDeniedPayload,
  PttReleasedPayload,
} from './ptt';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface ConnectionReadyPayload {
  userId: string;
  sessionId: string;
  serverTime: number;
}

export interface PresencePayload {
  userId: string;
  status: UserPresenceStatus;
  timestamp: number;
  activeSocketsCount?: number;
}

export interface UserPresencePayload {
  userId: string;
  status: UserPresenceStatus;
  timestamp: number;
}

export interface JoinFrequencyPayload {
  frequencyCode: string;
  userId?: string;
}

export interface LeaveFrequencyPayload {
  frequencyCode: string;
  userId?: string;
}

export interface FrequencyJoinedPayload {
  frequencyCode: string;
  userCount: number;
  maxUsers: number;
  status: FrequencyStatus;
  users: UserSummary[];
}

export interface FrequencyLeftPayload {
  frequencyCode: string;
  userCount: number;
  maxUsers: number;
}

export interface FrequencyStatePayload {
  frequencyCode: string;
  userCount: number;
  maxUsers: number;
  status: FrequencyStatus;
  users: UserSummary[];
}

export interface FrequencyUsersPayload {
  frequencyCode: string;
  count: number;
  maxUsers: number;
  users: UserSummary[];
  activeSpeakerId: string | null;
}

export interface RealtimeErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface VoiceSignalPayload {
  frequencyCode: string;
  senderId: string;
  signalData: unknown;
}

// Client to Server Events
export interface ClientToServerEvents {
  'frequency:join': (
    payload: JoinFrequencyPayload,
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
  'frequency:leave': (
    payload: LeaveFrequencyPayload,
    callback?: (response: { success: boolean }) => void
  ) => void;
  'presence:heartbeat': () => void;

  // Phase 7 Push-to-Talk Floor Control
  'ptt:request': (
    payload: { frequencyCode: string; userId?: string },
    callback?: (response: { granted: boolean; error?: string; state?: PttStatePayload }) => void
  ) => void;
  'ptt:release': (payload: { frequencyCode: string; userId?: string }) => void;
  'voice:signal': (payload: VoiceSignalPayload) => void;

  // Phase 6 WebRTC Voice Signaling
  'voice:join': (
    payload: VoiceJoinPayload,
    callback?: (response: { success: boolean; error?: string; config?: VoiceSessionConfig }) => void
  ) => void;
  'voice:leave': (payload: VoiceLeavePayload) => void;
  'voice:offer': (payload: VoiceOfferPayload) => void;
  'voice:answer': (payload: VoiceAnswerPayload) => void;
  'voice:ice-candidate': (payload: VoiceIceCandidatePayload) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'connection:ready': (payload: ConnectionReadyPayload) => void;
  'connection:state': (payload: { state: ConnectionState }) => void;
  'presence:online': (payload: PresencePayload) => void;
  'presence:offline': (payload: PresencePayload) => void;
  'presence:update': (payload: PresencePayload) => void;
  'frequency:joined': (payload: FrequencyJoinedPayload) => void;
  'frequency:left': (payload: FrequencyLeftPayload) => void;
  'frequency:state': (payload: FrequencyStatePayload) => void;
  'frequency:users': (payload: FrequencyUsersPayload) => void;
  'frequency:error': (payload: RealtimeErrorPayload) => void;
  'user:online': (payload: UserPresencePayload) => void;
  'user:offline': (payload: UserPresencePayload) => void;

  // Phase 7 Push-to-Talk Floor Events
  'ptt:state': (payload: PttStatePayload) => void;
  'ptt:granted': (payload: PttGrantedPayload) => void;
  'ptt:denied': (payload: PttDeniedPayload) => void;
  'ptt:released': (payload: PttReleasedPayload) => void;
  'ptt:error': (payload: { code: string; message: string }) => void;

  'voice:signal': (payload: VoiceSignalPayload) => void;
  'error': (payload: { code: string; message: string }) => void;

  // Phase 6 WebRTC Voice Signaling
  'voice:peer-joined': (payload: VoicePeerJoinedPayload) => void;
  'voice:peer-left': (payload: VoicePeerLeftPayload) => void;
  'voice:offer': (payload: { frequencyCode: string; senderPeerId: string; sdp: string }) => void;
  'voice:answer': (payload: { frequencyCode: string; senderPeerId: string; sdp: string }) => void;
  'voice:ice-candidate': (payload: { frequencyCode: string; senderPeerId: string; candidate: any }) => void;
  'voice:error': (payload: VoiceErrorPayload) => void;
}

// Inter-server Events
export interface InterServerEvents {
  ping: () => void;
}

// Socket Data attached to each socket
export interface SocketData {
  userId?: string;
  sessionId?: string;
  frequencyCode?: string;
  authenticated?: boolean;
}
