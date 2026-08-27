import { Platform } from 'react-native';
import type { IceServerConfig, VoiceConnectionState } from '../types/voice.types';
import { signalingService } from './signaling.service';
import { useAuthStore } from '../../../store/authStore';

export interface WebRTCCallbacks {
  onConnectionStateChange?: (state: VoiceConnectionState) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onPeerLeft?: (peerId: string) => void;
  onError?: (error: string) => void;
}

/** Helper to optimize SDP for sub-50ms ultra-low-latency Opus transmission */
function optimizeOpusSdp(sdp: string): string {
  return sdp.replace(
    /a=rtpmap:(\d+) opus\/48000\/2/g,
    'a=rtpmap:$1 opus/48000/2\r\na=fmtp:$1 minptime=10;useinbandfec=1;maxplaybackrate=48000;stereo=0;sprop-stereo=0'
  );
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private iceServers: IceServerConfig[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];
  private activeFrequency: string | null = null;
  private callbacks: WebRTCCallbacks = {};
  private connectionState: VoiceConnectionState = 'NEW';
  private isAudioUnlocked = false;

  public setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  public setIceServers(servers: IceServerConfig[]) {
    this.iceServers = servers;
  }

  public getConnectionState(): VoiceConnectionState {
    return this.connectionState;
  }

  private updateState(state: VoiceConnectionState) {
    this.connectionState = state;
    this.callbacks.onConnectionStateChange?.(state);
  }

  /**
   * Unlock Web Audio & Autoplay policies on mobile browsers (Android / iOS)
   */
  public unlockAudioContext() {
    if (this.isAudioUnlocked || typeof window === 'undefined') return;
    this.isAudioUnlocked = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
      this.remoteAudioElements.forEach((el) => {
        el.play().catch(() => {});
      });
    } catch {
      // Best effort
    }
  }

  /**
   * Acquire local microphone audio stream with clean cross-platform constraints
   */
  public async startLocalAudio(): Promise<MediaStream | null> {
    if (this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return this.localStream;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        // Default to muted until PTT is pressed
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });

        this.localStream = stream;

        // Attach local track to all existing peer connection senders in 0ms
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          this.peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track === null || s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack).catch(() => {});
            } else {
              try {
                pc.addTrack(audioTrack, stream);
              } catch {
                // Ignore
              }
            }
          });
        }

        return stream;
      }
    } catch (err: any) {
      this.callbacks.onError?.(`Microphone capture error: ${err.message}`);
      return null;
    }
    return null;
  }

  /**
   * Stop local microphone audio stream
   */
  public stopLocalAudio() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  /**
   * Toggle audio transmission over established WebRTC peer connections (PTT floor control)
   * Instantaneous 0ms un-mute
   */
  public setAudioTransmission(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    this.unlockAudioContext();
  }

  /**
   * Initialize WebRTC session for a frequency
   */
  public async initSession(frequencyCode: string, iceServers: IceServerConfig[]) {
    // If switching frequencies, clean up old peer connections for strict channel isolation
    if (this.activeFrequency && this.activeFrequency !== frequencyCode) {
      this.peerConnections.forEach((pc) => pc.close());
      this.peerConnections.clear();
      this.remoteAudioElements.forEach((el) => {
        el.pause();
        el.srcObject = null;
        el.remove();
      });
      this.remoteAudioElements.clear();
    }

    this.activeFrequency = frequencyCode;
    if (iceServers && iceServers.length > 0) {
      this.iceServers = iceServers;
    }
    this.updateState('CONNECTING');

    // Pre-warm local microphone in background
    this.startLocalAudio().catch(() => {});

    // Register signaling callbacks
    signalingService.setCallbacks({
      onPeerJoined: (payload) => {
        const myUserId = useAuthStore.getState().user?.id;
        if (payload.peerId !== myUserId) {
          this.createOfferForPeer(payload.peerId);
        }
      },
      onPeerLeft: (payload) => {
        this.closePeer(payload.peerId);
        this.callbacks.onPeerLeft?.(payload.peerId);
      },
      onOffer: async (payload) => {
        const myUserId = useAuthStore.getState().user?.id;
        if (payload.frequencyCode === this.activeFrequency && payload.senderPeerId !== myUserId) {
          await this.handleIncomingOffer(payload.senderPeerId, payload.sdp);
        }
      },
      onAnswer: async (payload) => {
        const myUserId = useAuthStore.getState().user?.id;
        if (payload.frequencyCode === this.activeFrequency && payload.senderPeerId !== myUserId) {
          await this.handleIncomingAnswer(payload.senderPeerId, payload.sdp);
        }
      },
      onIceCandidate: async (payload) => {
        const myUserId = useAuthStore.getState().user?.id;
        if (payload.frequencyCode === this.activeFrequency && payload.senderPeerId !== myUserId) {
          await this.handleIncomingIceCandidate(payload.senderPeerId, payload.candidate);
        }
      },
      onError: (err) => {
        this.callbacks.onError?.(err.message);
        this.updateState('FAILED');
      },
    });

    this.updateState('CONNECTED');
  }

  private createPeerConnection(peerId: string): RTCPeerConnection | null {
    if (typeof RTCPeerConnection === 'undefined') return null;

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Always add an audio transceiver so the peer connection negotiates bidirectional audio
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch {
      // Fallback for older browsers
    }

    // Handle incoming remote audio track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const streamToPlay = remoteStream || new MediaStream([event.track]);
      this.playRemoteAudio(peerId, streamToPlay);
      this.callbacks.onRemoteStream?.(peerId, streamToPlay);
    };

    // Trickle ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && this.activeFrequency) {
        signalingService.sendIceCandidate(this.activeFrequency, peerId, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.updateState('CONNECTED');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.updateState('DISCONNECTED');
      }
    };

    // Add local audio track if already captured
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) {
        const sender = pc.getSenders().find((s) => s.track === null || s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          try {
            pc.addTrack(track, this.localStream);
          } catch {
            // Already attached
          }
        }
      }
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  public async createOfferForPeer(peerId: string) {
    if (!this.activeFrequency) return;

    if (!this.localStream) {
      await this.startLocalAudio();
    }

    let pc: RTCPeerConnection | null | undefined = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }
    if (!pc) return;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      const optimizedSdp = optimizeOpusSdp(offer.sdp || '');
      await pc.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: optimizedSdp }));

      signalingService.sendOffer(this.activeFrequency, peerId, optimizedSdp);
    } catch (err: any) {
      this.callbacks.onError?.(`Error creating offer: ${err.message}`);
    }
  }

  public async handleIncomingOffer(senderPeerId: string, sdp: string) {
    if (!this.activeFrequency) return;

    if (!this.localStream) {
      await this.startLocalAudio();
    }

    let pc: RTCPeerConnection | null | undefined = this.peerConnections.get(senderPeerId);
    if (!pc) {
      pc = this.createPeerConnection(senderPeerId);
    }
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      const optimizedSdp = optimizeOpusSdp(answer.sdp || '');
      await pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: optimizedSdp }));

      signalingService.sendAnswer(this.activeFrequency, senderPeerId, optimizedSdp);
    } catch (err: any) {
      this.callbacks.onError?.(`Error handling offer: ${err.message}`);
    }
  }

  public async handleIncomingAnswer(senderPeerId: string, sdp: string) {
    const pc = this.peerConnections.get(senderPeerId);
    if (pc && pc.signalingState !== 'stable') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      } catch (err: any) {
        this.callbacks.onError?.(`Error handling answer: ${err.message}`);
      }
    }
  }

  public async handleIncomingIceCandidate(senderPeerId: string, candidateInit: any) {
    const pc = this.peerConnections.get(senderPeerId);
    if (pc && pc.remoteDescription && candidateInit) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch {
        // Non-fatal candidate ignore
      }
    }
  }

  private playRemoteAudio(peerId: string, stream: MediaStream) {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let audioEl = this.remoteAudioElements.get(peerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `remote-audio-${peerId}`;
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', 'true');
        audioEl.setAttribute('webkit-playsinline', 'true');
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(peerId, audioEl);
      }
      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.volume = 1.0;

      const playAudio = () => {
        audioEl?.play().catch(() => {});
      };
      playAudio();

      const unlock = () => {
        playAudio();
      };
      window.addEventListener('touchstart', unlock, { once: true });
      window.addEventListener('click', unlock, { once: true });
    }
  }

  public closePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
  }

  public closeSession() {
    this.stopLocalAudio();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.remoteAudioElements.clear();

    if (this.activeFrequency) {
      signalingService.leaveVoiceSession(this.activeFrequency);
      this.activeFrequency = null;
    }

    this.updateState('CLOSED');
  }
}

export const webrtcService = new WebRTCService();
