export type VoiceConnectionState =
  | 'NEW'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'FAILED'
  | 'CLOSED';

export type MicrophonePermissionStatus = 'undetermined' | 'granted' | 'denied';

export type AudioOutputRoute = 'speaker' | 'earpiece' | 'bluetooth';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface VoicePeer {
  peerId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  isAudioActive?: boolean;
}

export interface VoiceSessionConfig {
  iceServers: IceServerConfig[];
  frequencyCode: string;
  maxBitrate: number;
}

export interface VoiceJoinPayload {
  frequencyCode: string;
}

export interface VoiceLeavePayload {
  frequencyCode: string;
}

export interface VoiceOfferPayload {
  frequencyCode: string;
  targetPeerId: string;
  sdp: string;
}

export interface VoiceAnswerPayload {
  frequencyCode: string;
  targetPeerId: string;
  sdp: string;
}

export interface VoiceIceCandidatePayload {
  frequencyCode: string;
  targetPeerId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

export interface VoicePeerJoinedPayload {
  frequencyCode: string;
  peerId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
}

export interface VoicePeerLeftPayload {
  frequencyCode: string;
  peerId: string;
}

export interface VoiceErrorPayload {
  code: string;
  message: string;
}
