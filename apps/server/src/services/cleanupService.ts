import { getPrismaClient } from '../repositories/prisma';
import { logger } from '../utils/logger';

export interface CleanupResult {
  expiredSessionsRevoked: number;
  staleTokensPruned: number;
  timestamp: string;
}

export async function runStaleDataCleanup(): Promise<CleanupResult> {
  const db = getPrismaClient();
  const now = new Date();

  // 1. Revoke expired sessions
  const expiredSessions = await db.session.updateMany({
    where: {
      expiresAt: { lt: now },
      revokedAt: null,
    },
    data: {
      revokedAt: now,
    },
  }).catch(() => ({ count: 0 }));

  // 2. Deactivate stale device tokens that haven't been touched in 60 days
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const staleTokens = await db.deviceToken.updateMany({
    where: {
      updatedAt: { lt: sixtyDaysAgo },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  }).catch(() => ({ count: 0 }));

  logger.info(
    {
      expiredSessionsRevoked: expiredSessions.count,
      staleTokensPruned: staleTokens.count,
    },
    '[CleanupService] Stale data cleanup completed'
  );

  return {
    expiredSessionsRevoked: expiredSessions.count,
    staleTokensPruned: staleTokens.count,
    timestamp: now.toISOString(),
  };
}
