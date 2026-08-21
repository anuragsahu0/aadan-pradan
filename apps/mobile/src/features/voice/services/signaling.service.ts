import { socketManager } from '../../../services/socket/socketManager';
import type {
  VoiceSessionConfig,
  VoicePeerJoinedPayload,
  VoicePeerLeftPayload,
} from '@aadan-pradan/types';

export interface SignalingCallbacks {
  onPeerJoined?: (payload: VoicePeerJoinedPayload) => void;
  onPeerLeft?: (payload: VoicePeerLeftPayload) => void;
  onOffer?: (payload: { frequencyCode: string; senderPeerId: string; sdp: string }) => void;
  onAnswer?: (payload: { frequencyCode: string; senderPeerId: string; sdp: string }) => void;
  onIceCandidate?: (payload: { frequencyCode: string; senderPeerId: string; candidate: any }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

class SignalingService {
  private callbacks: SignalingCallbacks = {};
  private activeFrequency: string | null = null;

  public setCallbacks(callbacks: SignalingCallbacks) {
    this.callbacks = callbacks;
  }

  public async joinVoiceSession(
    frequencyCode: string
  ): Promise<{ success: boolean; config?: VoiceSessionConfig; error?: string }> {
    const socket = socketManager.connect();
    if (!socket) {
      return { success: false, error: 'Socket not connected' };
    }

    this.activeFrequency = frequencyCode;
    this.setupListeners(socket);

    return new Promise((resolve) => {
      socket.emit('voice:join', { frequencyCode }, (res: any) => {
        resolve(res || { success: false, error: 'No response from signaling server' });
      });
    });
  }

  public leaveVoiceSession(frequencyCode: string) {
    const socket = socketManager.connect();
    if (socket) {
      socket.emit('voice:leave', { frequencyCode });
      this.removeListeners(socket);
    }
    this.activeFrequency = null;
  }

  public sendOffer(frequencyCode: string, targetPeerId: string, sdp: string) {
    const socket = socketManager.connect();
    if (socket) {
      socket.emit('voice:offer', { frequencyCode, targetPeerId, sdp });
    }
  }

  public sendAnswer(frequencyCode: string, targetPeerId: string, sdp: string) {
    const socket = socketManager.connect();
    if (socket) {
      socket.emit('voice:answer', { frequencyCode, targetPeerId, sdp });
    }
  }

  public sendIceCandidate(frequencyCode: string, targetPeerId: string, candidate: any) {
    const socket = socketManager.connect();
    if (socket) {
      socket.emit('voice:ice-candidate', { frequencyCode, targetPeerId, candidate });
    }
  }

  private setupListeners(socket: any) {
    socket.on('voice:peer-joined', this.handlePeerJoined);
    socket.on('voice:peer-left', this.handlePeerLeft);
    socket.on('voice:offer', this.handleOffer);
    socket.on('voice:answer', this.handleAnswer);
    socket.on('voice:ice-candidate', this.handleIceCandidate);
    socket.on('voice:error', this.handleError);
  }

  private removeListeners(socket: any) {
    socket.off('voice:peer-joined', this.handlePeerJoined);
    socket.off('voice:peer-left', this.handlePeerLeft);
    socket.off('voice:offer', this.handleOffer);
    socket.off('voice:answer', this.handleAnswer);
    socket.off('voice:ice-candidate', this.handleIceCandidate);
    socket.off('voice:error', this.handleError);
  }

  private handlePeerJoined = (payload: VoicePeerJoinedPayload) => {
    this.callbacks.onPeerJoined?.(payload);
  };

  private handlePeerLeft = (payload: VoicePeerLeftPayload) => {
    this.callbacks.onPeerLeft?.(payload);
  };

  private handleOffer = (payload: any) => {
    this.callbacks.onOffer?.(payload);
  };

  private handleAnswer = (payload: any) => {
    this.callbacks.onAnswer?.(payload);
  };

  private handleIceCandidate = (payload: any) => {
    this.callbacks.onIceCandidate?.(payload);
  };

  private handleError = (payload: any) => {
    this.callbacks.onError?.(payload);
  };
}

export const signalingService = new SignalingService();
