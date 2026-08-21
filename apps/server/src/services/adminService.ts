import type { Server } from 'socket.io';
import type {
  AdminOverviewStats,
  AdminUserListItem,
  AdminFrequencyListItem,
  AdminSecuritySummary,
  UserRole,
  UserAccountStatus,
} from '@aadan-pradan/types';
import { getPrismaClient } from '../repositories/prisma';
import { presenceService } from './presenceService';
import { talkLockService } from './talkLockService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { BadRequestError, NotFoundError } from '../utils/appError';
import { logger } from '../utils/logger';

const serverStartTime = Date.now();

class AdminService {
  /**
   * Fetch overview stats across the platform
   */
  public async getOverviewStats(): Promise<AdminOverviewStats> {
    const prisma = getPrismaClient();

    const [totalUsers, activeUsers, suspendedUsers, activeFrequencies] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE', isActive: true } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.frequency.count({ where: { isActive: true } }),
    ]);

    const onlineUsers = presenceService.getOnlineUserIds().length;
    const serverUptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      onlineUsers,
      activeFrequencies,
      activeSpeakersCount: 0,
      serverUptimeSeconds,
      systemHealth: 'HEALTHY',
      databaseStatus: 'connected',
    };
  }

  /**
   * Search and paginate users
   */
  public async searchUsers(params: {
    q?: string;
    role?: UserRole;
    status?: UserAccountStatus;
    page?: number;
    limit?: number;
  }): Promise<{ users: AdminUserListItem[]; total: number; page: number; limit: number }> {
    const prisma = getPrismaClient();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.q) {
      where.OR = [
        { username: { contains: params.q, mode: 'insensitive' } },
        { displayName: { contains: params.q, mode: 'insensitive' } },
        { email: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastSeenAt: true,
        },
      }),
    ]);

    const mappedUsers: AdminUserListItem[] = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      role: (u.role as UserRole) || 'USER',
      status: (u.status as UserAccountStatus) || 'ACTIVE',
      createdAt: u.createdAt.toISOString(),
      lastSeenAt: u.lastSeenAt?.toISOString() || null,
      isOnline: presenceService.isUserOnline(u.id),
      currentFrequencyCode: null,
    }));

    return { users: mappedUsers, total, page, limit };
  }

  /**
   * Suspend or unsuspend user with immediate session revocation and floor release
   */
  public async updateUserStatus(
    adminUserId: string,
    targetUserId: string,
    newStatus: UserAccountStatus,
    io?: Server
  ): Promise<{ id: string; username: string; status: UserAccountStatus }> {
    const prisma = getPrismaClient();

    // Self-protection: Admin cannot suspend themselves
    if (adminUserId === targetUserId && newStatus === 'SUSPENDED') {
      throw new BadRequestError('Administrators cannot suspend their own account');
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundError('Target user not found');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: newStatus,
        isActive: newStatus === 'ACTIVE',
      },
    });

    if (newStatus === 'SUSPENDED') {
      // 1. Invalidate all active sessions
      await prisma.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // 2. Deactivate device push tokens
      await notificationService.deactivateUserTokens(targetUserId);

      // 3. Release any PTT locks held
      if (io) {
        talkLockService.releaseUserLocks(targetUserId, io as any, 'disconnect');
      }

      logger.warn({ adminUserId, targetUserId }, '[AdminService] User suspended and sessions revoked');
    }

    await auditService.log({
      action: newStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      actorUserId: adminUserId,
      targetType: 'USER',
      targetId: targetUserId,
      metadata: { targetUsername: user.username, newStatus },
    });

    return {
      id: updated.id,
      username: updated.username,
      status: updated.status as UserAccountStatus,
    };
  }

  /**
   * List frequencies for admin monitoring
   */
  public async getFrequencies(page: number = 1, limit: number = 20): Promise<{
    frequencies: AdminFrequencyListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const prisma = getPrismaClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const skip = (p - 1) * l;

    const [total, frequencies] = await Promise.all([
      prisma.frequency.count(),
      prisma.frequency.findMany({
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
      }),
    ]);

    const mapped: AdminFrequencyListItem[] = frequencies.map((f) => {
      const speaker = talkLockService.getCurrentSpeaker(f.frequencyCode);
      return {
        id: f.id,
        frequencyCode: f.frequencyCode,
        name: f.name,
        maxUsers: f.maxUsers,
        memberCount: f.memberships.length,
        activeSpeaker: speaker ? { id: speaker.id, displayName: speaker.displayName } : null,
        isActive: f.isActive,
        createdAt: f.createdAt.toISOString(),
      };
    });

    return { frequencies: mapped, total, page: p, limit: l };
  }

  /**
   * Deactivate a virtual frequency
   */
  public async deactivateFrequency(
    adminUserId: string,
    frequencyCode: string,
    io?: Server
  ): Promise<boolean> {
    const prisma = getPrismaClient();

    const freq = await prisma.frequency.findUnique({ where: { frequencyCode } });
    if (!freq) {
      throw new NotFoundError('Virtual frequency not found');
    }

    await prisma.frequency.update({
      where: { frequencyCode },
      data: { isActive: false },
    });

    if (io) {
      // Clear talk lock and broadcast
      const speaker = talkLockService.getCurrentSpeaker(frequencyCode);
      if (speaker) {
        talkLockService.releaseLock(frequencyCode, speaker.id, 'left_frequency', io as any);
      }

      const roomKey = `frequency:${frequencyCode}`;
      io.to(roomKey).emit('frequency:error', {
        code: 'FREQUENCY_DEACTIVATED',
        message: 'This virtual frequency has been deactivated by administration.',
      });
    }

    await auditService.log({
      action: 'FREQUENCY_DEACTIVATED',
      actorUserId: adminUserId,
      targetType: 'FREQUENCY',
      targetId: frequencyCode,
    });

    return true;
  }

  /**
   * Security summary overview
   */
  public async getSecuritySummary(): Promise<AdminSecuritySummary> {
    const prisma = getPrismaClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [failedLogins, suspendedCount, rateLimitEvents, pttEvents] = await Promise.all([
      prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.auditLog.count({ where: { action: 'RATE_LIMIT_EXCEEDED' } }),
      prisma.auditLog.count({ where: { action: 'PTT_SECURITY_EVENT' } }),
    ]);

    return {
      failedLoginsLast24h: failedLogins,
      suspendedUsersCount: suspendedCount,
      rateLimitEventsCount: rateLimitEvents,
      unauthorizedPttAttempts: pttEvents,
    };
  }
}

export const adminService = new AdminService();
