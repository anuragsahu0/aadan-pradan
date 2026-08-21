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
