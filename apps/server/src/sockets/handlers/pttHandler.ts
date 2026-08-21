import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PttStatePayload,
  PttSpeakerInfo,
} from '@aadan-pradan/types';
import { normalizeFrequencyCode, isValidFrequencyCode } from '@aadan-pradan/utils';
import { MAX_TALK_DURATION_MS } from '@aadan-pradan/config';
import { talkLockService } from '../../services/talkLockService';
import { findUserById } from '../../repositories/userRepository';
import { logger } from '../../utils/logger';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerPttHandlers(io: TypedServer, socket: TypedSocket): void {
  // ─── PTT Floor Request ──────────────────────────────────────────────────────
  socket.on(
    'ptt:request',
    async (
      payload: { frequencyCode: string; userId?: string },
      callback?: (response: { granted: boolean; error?: string; state?: PttStatePayload }) => void
    ) => {
      try {
        const userId = socket.data.userId;
        const { frequencyCode } = payload;

        if (!userId) {
          logger.warn({ socketId: socket.id }, '[PTT Handler] Unauthorized PTT floor request');
          socket.emit('ptt:denied', {
            frequencyCode,
            code: 'UNAUTHORIZED',
            message: 'Authentication required to transmit on this frequency',
          });
          callback?.({ granted: false, error: 'Authentication required' });
          return;
        }

        if (!isValidFrequencyCode(frequencyCode)) {
          socket.emit('ptt:denied', {
            frequencyCode,
            code: 'INVALID_FREQUENCY',
            message: 'Invalid virtual frequency format',
          });
          callback?.({ granted: false, error: 'Invalid frequency format' });
          return;
        }

        const normalized = normalizeFrequencyCode(frequencyCode);

        // Fetch user profile info
        const user = await findUserById(userId);
        const speakerInfo: PttSpeakerInfo = {
          id: userId,
          username: user?.username || 'operator',
          displayName: user?.displayName || 'Operator',
          avatar: user?.avatar,
        };

        // Atomic check-and-set lock acquisition
        const result = talkLockService.acquireLock(
          normalized,
          speakerInfo,
          socket.id,
          io,
          MAX_TALK_DURATION_MS
        );

        if (result.granted) {
          logger.info(
            { frequencyCode: normalized, userId, socketId: socket.id },
            '[PTT Handler] Floor lock granted'
          );

          socket.emit('ptt:granted', {
            frequencyCode: normalized,
            speaker: speakerInfo,
            grantedAt: Date.now(),
            maxDurationMs: MAX_TALK_DURATION_MS,
            expiresAt: Date.now() + MAX_TALK_DURATION_MS,
          });

          callback?.({ granted: true, state: result.state });
        } else {
          logger.info(
            {
              frequencyCode: normalized,
              userId,
              reason: result.code,
              currentSpeaker: result.currentSpeaker?.displayName,
            },
            '[PTT Handler] Floor lock denied'
          );

          socket.emit('ptt:denied', {
            frequencyCode: normalized,
            code: result.code === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'CHANNEL_BUSY',
            message: result.error || 'Channel is currently busy',
            currentSpeaker: result.currentSpeaker,
          });

          callback?.({ granted: false, error: result.error, state: result.state });
        }
      } catch (err: any) {
        logger.error({ err, socketId: socket.id }, '[PTT Handler] Error processing ptt:request');
        socket.emit('ptt:denied', {
          frequencyCode: payload.frequencyCode,
          code: 'CHANNEL_BUSY',
          message: 'An unexpected server error occurred while processing floor request',
        });
        callback?.({ granted: false, error: 'Internal server error' });
      }
    }
  );

  // ─── PTT Floor Release ──────────────────────────────────────────────────────
  socket.on(
    'ptt:release',
    async (payload: { frequencyCode: string; userId?: string }) => {
      try {
        const userId = socket.data.userId;
        const { frequencyCode } = payload;

        if (!userId) return;

        const normalized = normalizeFrequencyCode(frequencyCode);
        const released = talkLockService.releaseLock(
          normalized,
          userId,
          'user_release',
          io
        );

        if (released) {
          logger.info(
            { frequencyCode: normalized, userId, socketId: socket.id },
            '[PTT Handler] Floor lock released by operator'
          );
        }
      } catch (err: any) {
        logger.error({ err, socketId: socket.id }, '[PTT Handler] Error processing ptt:release');
      }
    }
  );

  // ─── Disconnect Cleanup ─────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (socket.data.userId) {
      talkLockService.releaseUserLocks(socket.data.userId, io, 'disconnect');
    }
  });
}

export function releaseSpeakerLockOnDisconnect(io: TypedServer, userId: string): void {
  talkLockService.releaseUserLocks(userId, io, 'disconnect');
}
