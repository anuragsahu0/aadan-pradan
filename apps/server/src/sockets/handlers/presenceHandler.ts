import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@aadan-pradan/types';
import { presenceService } from '../../services/presenceService';
import { logger } from '../../utils/logger';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerPresenceHandlers(io: TypedServer, socket: TypedSocket): void {
  socket.on('presence:heartbeat', () => {
    const userId = socket.data.userId;
    if (userId) {
      logger.debug({ userId, socketId: socket.id }, '[Presence] Heartbeat received');
    }
  });
}
