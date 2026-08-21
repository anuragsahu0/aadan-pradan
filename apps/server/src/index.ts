import http from 'node:http';
import { createExpressApp } from './server';
import { initializeSocketServer } from './sockets/socketServer';
import { env } from './config/env';
import { logger } from './utils/logger';
import { checkDatabaseConnection, getPrismaClient } from './repositories/prisma';
import { talkLockService } from './services/talkLockService';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@aadan-pradan/config';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info(`📻 ${APP_NAME.toUpperCase()} — ${APP_TAGLINE.toUpperCase()}`);
  logger.info(`   Version: ${APP_VERSION} | Env: ${env.NODE_ENV}`);
  logger.info('=====================================================');

  // Verify database connectivity if configured
  if (env.DATABASE_URL) {
    logger.info('[Database] Probing PostgreSQL connection...');
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.connected) {
      logger.info('[Database] PostgreSQL connection established successfully');
    } else {
      logger.warn({ error: dbStatus.message }, '[Database] PostgreSQL connection unavailable');
    }
  } else {
    logger.info('[Database] DATABASE_URL not set (Running in dev mode without DB persistence)');
  }

  // Create Express App & HTTP Server
  const app = createExpressApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO engine
  const io = initializeSocketServer(httpServer);

  // Start HTTP Server
  const server = httpServer.listen(env.PORT, env.HOST, () => {
    logger.info(`[Server] HTTP server running on http://${env.HOST}:${env.PORT}`);
    logger.info(`[Server] Health endpoint ready at http://${env.HOST}:${env.PORT}/api/health`);
    logger.info(`[Server] Readiness endpoint ready at http://${env.HOST}:${env.PORT}/api/health/ready`);
    logger.info(`[Server] Config endpoint ready at http://${env.HOST}:${env.PORT}/api/config`);
    logger.info(`[Config] MAX_USERS_PER_FREQUENCY: ${env.MAX_USERS_PER_FREQUENCY}`);
    logger.info(`[Config] DEFAULT_FREQUENCY: ${env.DEFAULT_FREQUENCY}`);
  });

  // Graceful Shutdown Management
  const shutdown = async (signal: string) => {
    logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);

    // Release all active talk locks
    try {
      talkLockService.clear();
      logger.info('[TalkLock] All active floor locks released');
    } catch {
      // Ignore
    }

    // Stop accepting new HTTP connections
    server.close(() => {
      logger.info('[Server] HTTP server closed');
    });

    // Close Socket.IO server
    io.close(() => {
      logger.info('[Socket.IO] Real-time engine closed');
    });

    // Disconnect Prisma
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
      logger.info('[Database] Prisma client disconnected');
    } catch {
      // Ignore if not connected
    }

    logger.info('[Server] Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '[Fatal] Uncaught Exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, '[Error] Unhandled Promise Rejection');
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, '[Bootstrap] Server startup failed');
  process.exit(1);
});
