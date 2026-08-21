import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@aadan-pradan/types';
import { logger } from '../../utils/logger';
import { releaseSpeakerLockOnDisconnect } from './pttHandler';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerUserStatusHandlers(io: TypedServer, socket: TypedSocket): void {
  // Broadcast presence when socket connects
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId, reason }, '[Socket] Client disconnected');

    if (socket.data.userId) {
      io.emit('user:offline', {
        userId: socket.data.userId,
        status: 'offline',
        timestamp: Date.now(),
      });

      // Release any active PTT transmission lock if user disconnects while speaking
      releaseSpeakerLockOnDisconnect(io, socket.data.userId);
    }
  });
}
