import { getPrismaClient } from '../repositories/prisma';
import { presenceService } from './presenceService';
import { talkLockService } from './talkLockService';
import { APP_VERSION } from '@aadan-pradan/config';

export interface SystemMetrics {
  version: string;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  observability: {
    activeOnlineUsers: number;
    activeFloorLocks: number;
    totalRegisteredUsers: number;
    activeFrequencies: number;
    totalAuditLogs: number;
  };
  timestamp: string;
}

export async function collectSystemMetrics(): Promise<SystemMetrics> {
  const db = getPrismaClient();
  const mem = process.memoryUsage();

  const [totalUsers, activeFreqs, totalAudits] = await Promise.all([
    db.user.count().catch(() => 0),
    db.frequency.count({ where: { isActive: true } }).catch(() => 0),
    db.auditLog.count().catch(() => 0),
  ]);

  const onlineUsers = presenceService.getOnlineUserIds().length;

  return {
    version: APP_VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: {
      rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      external: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    },
    observability: {
      activeOnlineUsers: onlineUsers,
      activeFloorLocks: (talkLockService as any).locks ? (talkLockService as any).locks.size : 0,
      totalRegisteredUsers: totalUsers,
      activeFrequencies: activeFreqs,
      totalAuditLogs: totalAudits,
    },
    timestamp: new Date().toISOString(),
  };
}
