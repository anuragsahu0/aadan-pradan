import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });

    if (env.NODE_ENV === 'development') {
      prismaInstance.$on('error' as never, (e: unknown) => {
        logger.error({ error: e }, '[Database Error]');
      });
      prismaInstance.$on('warn' as never, (e: unknown) => {
        logger.warn({ warning: e }, '[Database Warning]');
      });
    }
  }

  return prismaInstance;
}

export async function checkDatabaseConnection(): Promise<{ connected: boolean; message?: string }> {
  if (!env.DATABASE_URL) {
    return { connected: false, message: 'DATABASE_URL not configured' };
  }

  try {
    const client = getPrismaClient();
    // Simple fast probe query
    await client.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    const err = error as Error;
    logger.warn({ error: err.message }, '[Database Connection Check] Unable to connect to PostgreSQL');
    return { connected: false, message: err.message };
  }
}
