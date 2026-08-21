import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  JoinFrequencyPayload,
  LeaveFrequencyPayload,
  UserSummary,
} from '@aadan-pradan/types';
import { isValidFrequencyCode, normalizeFrequencyCode } from '@aadan-pradan/utils';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import {
  joinFrequencyAtomic,
  leaveFrequency,
  getActiveUsersInFrequency,
} from '../../repositories/frequencyRepository';
import { presenceService } from '../../services/presenceService';
import { talkLockService } from '../../services/talkLockService';
import { logger } from '../../utils/logger';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerFrequencyHandlers(io: TypedServer, socket: TypedSocket): void {
  // ─── Join Frequency ─────────────────────────────────────────────────────────
  socket.on(
    'frequency:join',
    async (
      payload: JoinFrequencyPayload,
      callback?: (response: { success: boolean; error?: string }) => void
    ) => {
      try {
        const { frequencyCode } = payload;
        const userId = socket.data.userId || payload.userId;

        if (!userId) {
          logger.warn({ socketId: socket.id }, '[Socket] Unauthorized frequency join attempt');
          callback?.({ success: false, error: 'AUTH_REQUIRED: Authentication required' });
          socket.emit('frequency:error', {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required to join virtual frequency',
          });
          return;
        }

        if (!isValidFrequencyCode(frequencyCode)) {
          logger.warn({ socketId: socket.id, frequencyCode }, '[Socket] Invalid frequency code format');
          callback?.({ success: false, error: 'Invalid frequency format. Expected XXX.XXX (e.g. 145.800)' });
          socket.emit('frequency:error', {
            code: 'INVALID_FREQUENCY',
            message: 'Invalid virtual frequency format',
          });
          return;
        }

        const normalized = normalizeFrequencyCode(frequencyCode);
        const roomKey = `frequency:${normalized}`;

        // 1. Atomic Database Membership Sync with 40-User Hard Limit
        let joinResult;
        try {
          joinResult = await joinFrequencyAtomic(normalized, userId, MAX_USERS_PER_FREQUENCY);
        } catch (err: any) {
          const isFull = err.code === 'FREQUENCY_FULL' || err.message?.includes('full');
          logger.warn(
            { roomKey, userId, isFull, message: err.message },
            '[Socket] Failed atomic frequency join'
          );
          callback?.({
            success: false,
            error: isFull
              ? `Virtual frequency ${normalized} is full (maximum ${MAX_USERS_PER_FREQUENCY} operators allowed).`
              : err.message || 'Failed to join virtual frequency',
          });
          socket.emit('frequency:error', {
            code: isFull ? 'FREQUENCY_FULL' : 'JOIN_FAILED',
            message: isFull
              ? `Virtual frequency ${normalized} has reached its 40-user capacity.`
              : err.message || 'Failed to join virtual frequency',
          });
          return;
        }

        // 2. Leave existing frequency room if any
        if (socket.data.frequencyCode && socket.data.frequencyCode !== normalized) {
          const oldCode = socket.data.frequencyCode;
          const oldRoom = `frequency:${oldCode}`;
          socket.leave(oldRoom);
          presenceService.setSocketFrequency(socket.id, undefined);

          if (!presenceService.hasOtherSocketsInFrequency(userId, oldCode, socket.id)) {
            await leaveFrequency(oldCode, userId);
            const oldUsers = await getActiveUsersInFrequency(oldCode);
            const mappedOldUsers: UserSummary[] = oldUsers.map((u) => ({
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              avatar: u.avatar,
              status: presenceService.isUserOnline(u.id) ? 'online' : 'idle',
            }));

            io.to(oldRoom).emit('frequency:users', {
              frequencyCode: oldCode,
              count: oldUsers.length,
              maxUsers: MAX_USERS_PER_FREQUENCY,
              users: mappedOldUsers,
              activeSpeakerId: null,
            });

            io.to(oldRoom).emit('frequency:state', {
              frequencyCode: oldCode,
              userCount: oldUsers.length,
              maxUsers: MAX_USERS_PER_FREQUENCY,
              status: oldUsers.length >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'AVAILABLE',
              users: mappedOldUsers,
            });
          }
        }

        // 3. Join Socket.IO frequency room & track socket frequency
        socket.join(roomKey);
        socket.data.frequencyCode = normalized;
        presenceService.setSocketFrequency(socket.id, normalized);

        // 4. Fetch live active operators with live online presence status
        const activeUsers = await getActiveUsersInFrequency(normalized);
        const mappedUsers: UserSummary[] = activeUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          status: presenceService.isUserOnline(u.id) ? 'online' : 'idle',
        }));

        logger.info(
          { socketId: socket.id, userId, frequencyCode: normalized, memberCount: activeUsers.length },
          `[Socket] Operator joined virtual frequency ${normalized}`
        );

        // 5. Emit frequency:joined and current ptt:state to the connecting socket
        socket.emit('frequency:joined', {
          frequencyCode: normalized,
          userCount: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          status: activeUsers.length >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'CONNECTED',
          users: mappedUsers,
        });

        socket.emit('ptt:state', talkLockService.getPttState(normalized));

        // 6. Broadcast updated state to all connected operators in this frequency room
        io.to(roomKey).emit('frequency:users', {
          frequencyCode: normalized,
          count: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          users: mappedUsers,
          activeSpeakerId: null,
        });

        io.to(roomKey).emit('frequency:state', {
          frequencyCode: normalized,
          userCount: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          status: activeUsers.length >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'AVAILABLE',
          users: mappedUsers,
        });

        callback?.({ success: true });
      } catch (error) {
        logger.error({ error, socketId: socket.id }, '[Socket] Error in frequency:join handler');
        callback?.({ success: false, error: 'Internal socket error joining frequency' });
      }
    }
  );

  // ─── Leave Frequency ────────────────────────────────────────────────────────
  socket.on(
    'frequency:leave',
    async (
      payload: LeaveFrequencyPayload,
      callback?: (response: { success: boolean }) => void
    ) => {
      try {
        const { frequencyCode } = payload;
        const userId = socket.data.userId || payload.userId;
        const normalized = normalizeFrequencyCode(frequencyCode);
        const roomKey = `frequency:${normalized}`;

        presenceService.setSocketFrequency(socket.id, undefined);
        socket.leave(roomKey);
        socket.data.frequencyCode = undefined;

        // Only mark membership LEFT if user has no other active devices on this frequency
        if (userId && !presenceService.hasOtherSocketsInFrequency(userId, normalized, socket.id)) {
          await leaveFrequency(normalized, userId);
        }

        const activeUsers = await getActiveUsersInFrequency(normalized);
        const mappedUsers: UserSummary[] = activeUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          status: presenceService.isUserOnline(u.id) ? 'online' : 'idle',
        }));

        logger.info(
          { socketId: socket.id, frequencyCode: normalized, remainingCount: activeUsers.length },
          '[Socket] Operator left virtual frequency'
        );

        // Emit frequency:left to caller
        socket.emit('frequency:left', {
          frequencyCode: normalized,
          userCount: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
        });

        // Broadcast updated state to remaining operators
        io.to(roomKey).emit('frequency:users', {
          frequencyCode: normalized,
          count: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          users: mappedUsers,
          activeSpeakerId: null,
        });

        io.to(roomKey).emit('frequency:state', {
          frequencyCode: normalized,
          userCount: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          status: activeUsers.length >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'AVAILABLE',
          users: mappedUsers,
        });

        callback?.({ success: true });
      } catch (error) {
        logger.error({ error, socketId: socket.id }, '[Socket] Error in frequency:leave handler');
        callback?.({ success: false });
      }
    }
  );

  // ─── Disconnect Handling & Cleanup ──────────────────────────────────────────
  socket.on('disconnect', async () => {
    try {
      const { frequencyCode, userId } = socket.data;
      if (frequencyCode && userId) {
        logger.info(
          { socketId: socket.id, userId, frequencyCode },
          '[Socket] Disconnected operator detected on frequency'
        );

        presenceService.setSocketFrequency(socket.id, undefined);

        // Only release membership if user has no other sockets on this frequency
        if (!presenceService.hasOtherSocketsInFrequency(userId, frequencyCode, socket.id)) {
          await leaveFrequency(frequencyCode, userId);
        }

        const roomKey = `frequency:${frequencyCode}`;
        const activeUsers = await getActiveUsersInFrequency(frequencyCode);
        const mappedUsers: UserSummary[] = activeUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          status: presenceService.isUserOnline(u.id) ? 'online' : 'idle',
        }));

        io.to(roomKey).emit('frequency:users', {
          frequencyCode,
          count: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          users: mappedUsers,
          activeSpeakerId: null,
        });

        io.to(roomKey).emit('frequency:state', {
          frequencyCode,
          userCount: activeUsers.length,
          maxUsers: MAX_USERS_PER_FREQUENCY,
          status: activeUsers.length >= MAX_USERS_PER_FREQUENCY ? 'FULL' : 'AVAILABLE',
          users: mappedUsers,
        });
      }
    } catch (error) {
      logger.error({ error, socketId: socket.id }, '[Socket] Error cleaning up disconnected operator');
    }
  });
}
