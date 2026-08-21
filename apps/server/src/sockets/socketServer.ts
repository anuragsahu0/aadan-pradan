import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@aadan-pradan/types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../services/tokenService';
import { verifySessionActive } from '../services/authService';
import { presenceService } from '../services/presenceService';
import { registerFrequencyHandlers } from './handlers/frequencyHandler';
import { registerPttHandlers } from './handlers/pttHandler';
import { registerPresenceHandlers } from './handlers/presenceHandler';
import { registerVoiceSignalingHandlers } from './handlers/voiceSignalingHandler';

export function initializeSocketServer(httpServer: HttpServer): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim());

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: env.NODE_ENV === 'development' ? true : (allowedOrigins.includes('*') ? '*' : allowedOrigins),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 25000,
    }
  );

  /**
   * Strict Socket.IO Authentication Middleware (Phase 5)
   *
   * Authenticates every incoming socket using JWT access tokens.
   * Derives userId and sessionId strictly from verified tokens.
   * Rejects missing, invalid, expired, or revoked sessions.
   */
  io.use(async (socket, next) => {
    const rawAuth = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const token = typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
      ? rawAuth.slice(7)
      : rawAuth;

    if (!token || typeof token !== 'string') {
      logger.warn({ socketId: socket.id }, '[Socket Auth] Rejected connection — missing auth token');
      return next(new Error('AUTH_REQUIRED: Authentication token is required'));
    }

    try {
      const payload = verifyAccessToken(token);
      const sessionActive = await verifySessionActive(payload.sessionId);

      if (!sessionActive) {
        logger.warn(
          { socketId: socket.id, sessionId: payload.sessionId },
          '[Socket Auth] Rejected connection — session inactive or revoked'
        );
        return next(new Error('SESSION_EXPIRED: Your session has expired or been revoked'));
      }

      socket.data.userId = payload.userId;
      socket.data.sessionId = payload.sessionId;
      socket.data.authenticated = true;

      logger.debug(
        { socketId: socket.id, userId: payload.userId, sessionId: payload.sessionId },
        '[Socket Auth] Connection successfully authenticated'
      );
      next();
    } catch (err: any) {
      logger.warn(
        { socketId: socket.id, error: err.message },
        '[Socket Auth] Rejected connection — invalid or expired JWT'
      );
      return next(new Error('UNAUTHORIZED: Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId!;
    const sessionId = socket.data.sessionId!;

    // Register socket with Presence Service (Multi-device support)
    const { isFirstSocket, activeSocketsCount } = presenceService.registerSocket(
      userId,
      socket.id
    );

    logger.info(
      { socketId: socket.id, userId, activeSocketsCount, ip: socket.handshake.address },
      '[Socket] Authenticated client connected'
    );

    // 1. Send connection:ready acknowledgment to caller
    socket.emit('connection:ready', {
      userId,
      sessionId,
      serverTime: Date.now(),
    });

    socket.emit('connection:state', { state: 'CONNECTED' });

    // 2. If this is the user's first active socket, broadcast presence:online to all clients
    if (isFirstSocket) {
      io.emit('presence:online', {
        userId,
        status: 'online',
        timestamp: Date.now(),
        activeSocketsCount: 1,
      });

      io.emit('user:online', {
        userId,
        status: 'online',
        timestamp: Date.now(),
      });
    }

    // Register domain handlers
    registerPresenceHandlers(io, socket);
    registerFrequencyHandlers(io, socket);
    registerPttHandlers(io, socket);
    registerVoiceSignalingHandlers(io, socket);

    // Connection lifecycle disconnect cleanup
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, '[Socket] Client disconnected');

      const { isLastSocket, activeSocketsCount } = presenceService.unregisterSocket(
        socket.id
      );

      // Only broadcast offline if the user has no remaining active sockets
      if (isLastSocket) {
        io.emit('presence:offline', {
          userId,
          status: 'offline',
          timestamp: Date.now(),
          activeSocketsCount: 0,
        });

        io.emit('user:offline', {
          userId,
          status: 'offline',
          timestamp: Date.now(),
        });
      }
    });
  });

  logger.info('[Socket.IO] Real-time engine initialized with strict authentication & presence');
  return io;
}
