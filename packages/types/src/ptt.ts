export type PttState = 'FREE' | 'REQUESTING' | 'ACTIVE';

export type PttButtonState =
  | 'idle'
  | 'requesting'
  | 'talking'
  | 'busy'
  | 'disabled'
  | 'error';

export interface PttSpeakerInfo {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
}

export interface PttStatePayload {
  frequencyCode: string;
  state: 'FREE' | 'ACTIVE';
  speaker: PttSpeakerInfo | null;
  startedAt?: number;
  expiresAt?: number;
  maxDurationMs?: number;
}

export interface PttGrantedPayload {
  frequencyCode: string;
  speaker: PttSpeakerInfo;
  grantedAt: number;
  expiresAt: number;
  maxDurationMs: number;
}

export interface PttDeniedPayload {
  frequencyCode: string;
  code:
    | 'CHANNEL_BUSY'
    | 'NOT_A_FREQUENCY_MEMBER'
    | 'RATE_LIMITED'
    | 'UNAUTHORIZED'
    | 'INVALID_FREQUENCY';
  message: string;
  currentSpeaker?: PttSpeakerInfo | null;
}

export interface PttReleasedPayload {
  frequencyCode: string;
  releasedBy: string;
  reason: 'user_release' | 'timeout' | 'disconnect' | 'left_frequency';
  releasedAt: number;
}
