import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  VoiceJoinPayload,
  VoiceLeavePayload,
  VoiceOfferPayload,
  VoiceAnswerPayload,
  VoiceIceCandidatePayload,
  IceServerConfig,
} from '@aadan-pradan/types';
import { normalizeFrequencyCode, isValidFrequencyCode } from '@aadan-pradan/utils';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { findUserById } from '../../repositories/userRepository';
import { findFrequencyByCode } from '../../repositories/frequencyRepository';
import { memStore } from '../../repositories/memFallback';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/** Map of socketId -> active voice room */
const socketVoiceRooms = new Map<string, string>();

export function getIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];
  if (env.WEBRTC_TURN_URL) {
    servers.push({
      urls: env.WEBRTC_TURN_URL,
      username: env.WEBRTC_TURN_USERNAME,
      credential: env.WEBRTC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export function registerVoiceSignalingHandlers(io: TypedServer, socket: TypedSocket): void {
  // ─── Voice Join & Session Initialization ────────────────────────────────────
  socket.on('voice:join', async (payload: VoiceJoinPayload, callback) => {
    try {
      const userId = socket.data.userId;
      const { frequencyCode } = payload;

      if (!userId) {
        callback?.({ success: false, error: 'Authentication required to initiate voice' });
        socket.emit('voice:error', {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required to initiate voice session',
        });
        return;
      }

      if (!isValidFrequencyCode(frequencyCode)) {
        callback?.({ success: false, error: 'Invalid frequency code' });
        socket.emit('voice:error', {
          code: 'INVALID_FREQUENCY',
          message: 'Invalid virtual frequency format',
        });
        return;
      }

      const normalized = normalizeFrequencyCode(frequencyCode);

      // Authorization Check: Verify active membership in frequency
      const freq = await findFrequencyByCode(normalized);
      if (!freq) {
        callback?.({ success: false, error: 'You must join this virtual frequency before initiating voice' });
        socket.emit('voice:error', {
          code: 'NOT_A_FREQUENCY_MEMBER',
          message: 'You must be an active member of this virtual frequency to participate in voice',
        });
        return;
      }

      let isActiveMember = false;
      try {
        const { getPrismaClient } = await import('../../repositories/prisma');
        const m = await getPrismaClient().frequencyMembership.findUnique({
          where: {
            userId_frequencyId: {
              userId,
              frequencyId: freq.id,
            },
          },
        });
        isActiveMember = !!m && m.status === 'ACTIVE';
      } catch {
        const mem = memStore.memberships.get(`${userId}_${freq.id}`);
        isActiveMember = !!mem && mem.status === 'ACTIVE';
      }

      // If user is an auto-assigned tactical operator, grant active membership
      if (!isActiveMember) {
        const user = await findUserById(userId);
        if (user && (user.email?.includes('operator.aadanpradan.io') || user.username.startsWith('usr_'))) {
          isActiveMember = true;
          memStore.memberships.set(`${userId}_${freq.id}`, {
            id: `mem_${userId}_${freq.id}`,
            userId,
            frequencyId: freq.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            leftAt: null,
          });
        }
      }

      if (!isActiveMember) {
        callback?.({ success: false, error: 'You must join this virtual frequency before initiating voice' });
        socket.emit('voice:error', {
          code: 'NOT_A_FREQUENCY_MEMBER',
          message: 'You must be an active member of this virtual frequency to participate in voice',
        });
        return;
      }

      const voiceRoom = `voice:${normalized}`;
      socket.join(voiceRoom);
      socketVoiceRooms.set(socket.id, voiceRoom);

      // Fetch user profile info
      const user = await findUserById(userId);

      // Broadcast peer-joined to other voice participants in this frequency room
      socket.to(voiceRoom).emit('voice:peer-joined', {
        frequencyCode: normalized,
        peerId: userId,
        username: user?.username || 'operator',
        displayName: user?.displayName || 'Operator',
        avatar: user?.avatar,
      });

      const iceServers = getIceServers();
      logger.info(
        { userId, frequencyCode: normalized, socketId: socket.id },
        '[Voice Signaling] Operator joined voice session room'
      );

      callback?.({
        success: true,
        config: {
          frequencyCode: normalized,
          iceServers,
          maxBitrate: 32000,
        },
      });
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, '[Voice Signaling] Error processing voice:join');
      callback?.({ success: false, error: 'Internal signaling error' });
      socket.emit('voice:error', {
        code: 'SIGNALING_ERROR',
        message: 'Internal server error while joining voice room',
      });
    }
  });

  // ─── Voice SDP Offer Forwarding (To all other peers, excluding sender) ──────
  socket.on('voice:offer', (payload: VoiceOfferPayload) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const { frequencyCode, targetPeerId, sdp } = payload;
      const normalized = normalizeFrequencyCode(frequencyCode);
      const voiceRoom = `voice:${normalized}`;

      logger.debug(
        { from: userId, to: targetPeerId, frequencyCode: normalized },
        '[Voice Signaling] Forwarding SDP offer'
      );

      // Forward to other peers in room, never echo back to the sender
      socket.to(voiceRoom).emit('voice:offer', {
        frequencyCode: normalized,
        senderPeerId: userId,
        sdp,
      });
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, '[Voice Signaling] Error forwarding SDP offer');
    }
  });

  // ─── Voice SDP Answer Forwarding (To all other peers, excluding sender) ─────
  socket.on('voice:answer', (payload: VoiceAnswerPayload) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const { frequencyCode, targetPeerId, sdp } = payload;
      const normalized = normalizeFrequencyCode(frequencyCode);
      const voiceRoom = `voice:${normalized}`;

      logger.debug(
        { from: userId, to: targetPeerId, frequencyCode: normalized },
        '[Voice Signaling] Forwarding SDP answer'
      );

      // Forward to other peers in room, never echo back to the sender
      socket.to(voiceRoom).emit('voice:answer', {
        frequencyCode: normalized,
        senderPeerId: userId,
        sdp,
      });
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, '[Voice Signaling] Error forwarding SDP answer');
    }
  });

  // ─── ICE Candidate Exchange (To all other peers, excluding sender) ──────────
  socket.on('voice:ice-candidate', (payload: VoiceIceCandidatePayload) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const { frequencyCode, targetPeerId, candidate } = payload;
      const normalized = normalizeFrequencyCode(frequencyCode);
      const voiceRoom = `voice:${normalized}`;

      // Forward to other peers in room, never echo back to the sender
      socket.to(voiceRoom).emit('voice:ice-candidate', {
        frequencyCode: normalized,
        senderPeerId: userId,
        candidate,
      });
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, '[Voice Signaling] Error relaying ICE candidate');
    }
  });

  // ─── Voice Leave ────────────────────────────────────────────────────────────
  socket.on('voice:leave', (payload: VoiceLeavePayload) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const { frequencyCode } = payload;
      const normalized = normalizeFrequencyCode(frequencyCode);
      const voiceRoom = `voice:${normalized}`;

      socket.leave(voiceRoom);
      socketVoiceRooms.delete(socket.id);

      socket.to(voiceRoom).emit('voice:peer-left', {
        frequencyCode: normalized,
        peerId: userId,
      });

      logger.info(
        { userId, frequencyCode: normalized, socketId: socket.id },
        '[Voice Signaling] Operator left voice session room'
      );
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, '[Voice Signaling] Error processing voice:leave');
    }
  });
}
