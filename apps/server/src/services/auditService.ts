import { getPrismaClient } from '../repositories/prisma';
import { logger } from '../utils/logger';

export interface LogAuditParams {
  action: string;
  actorUserId?: string | null;
  targetType?: 'USER' | 'FREQUENCY' | 'SYSTEM' | string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface GetAuditLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  actorUserId?: string;
}

class AuditService {
  /**
   * Record a security / administrative audit event
   */
  public async log(params: LogAuditParams): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const sanitizedMeta = this.sanitizeMetadata(params.metadata);

      await prisma.auditLog.create({
        data: {
          action: params.action,
          actorUserId: params.actorUserId ?? null,
          targetType: params.targetType ?? null,
          targetId: params.targetId ?? null,
          metadata: sanitizedMeta ? JSON.stringify(sanitizedMeta) : null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });

      logger.info(
        { action: params.action, actorUserId: params.actorUserId, targetType: params.targetType, targetId: params.targetId },
        '[AuditService] Action logged'
      );
    } catch (err: any) {
      logger.error({ error: err.message }, '[AuditService] Failed to record audit log');
    }
  }

  /**
   * Fetch paginated audit logs
   */
  public async getAuditLogs(query: GetAuditLogsQuery): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const prisma = getPrismaClient();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.actorUserId) where.actorUserId = query.actorUserId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedLogs = logs.map((l) => ({
      id: l.id,
      actorUserId: l.actorUserId,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      logs: formattedLogs,
      total,
      page,
      limit,
    };
  }

  private sanitizeMetadata(meta?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!meta) return null;
    const copy = { ...meta };
    const sensitive = ['password', 'token', 'refreshToken', 'secret', 'authorization'];

    for (const key of Object.keys(copy)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '[REDACTED]';
      }
    }
    return copy;
  }
}

export const auditService = new AuditService();
