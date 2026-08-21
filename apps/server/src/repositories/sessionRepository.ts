import { getPrismaClient } from './prisma';
import { memStore } from './memFallback';
import crypto from 'node:crypto';

const db = () => getPrismaClient();

export async function createSession(data: {
  userId: string;
  refreshTokenHash: string;
  deviceId?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}) {
  try {
    return await db().session.create({ data });
  } catch {
    const id = `sess_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newSession = {
      id,
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      deviceId: data.deviceId || null,
      userAgent: data.userAgent || null,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    };
    memStore.sessions.set(id, newSession);
    return newSession as any;
  }
}

export async function findSessionByRefreshHash(refreshTokenHash: string) {
  try {
    return await db().session.findUnique({ where: { refreshTokenHash } });
  } catch {
    for (const s of memStore.sessions.values()) {
      if (s.refreshTokenHash === refreshTokenHash && !s.revokedAt) {
        return s as any;
      }
    }
    return null;
  }
}

export async function findSessionById(id: string) {
  try {
    return await db().session.findUnique({ where: { id } });
  } catch {
    return (memStore.sessions.get(id) || null) as any;
  }
}

export async function revokeSession(id: string) {
  try {
    return await db().session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  } catch {
    const s = memStore.sessions.get(id);
    if (s) s.revokedAt = new Date();
    return s as any;
  }
}

export async function revokeAllUserSessions(userId: string) {
  try {
    return await db().session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    let count = 0;
    const now = new Date();
    for (const s of memStore.sessions.values()) {
      if (s.userId === userId && !s.revokedAt) {
        s.revokedAt = now;
        count++;
      }
    }
    return { count } as any;
  }
}

export async function updateSessionRefreshHash(
  id: string,
  refreshTokenHash: string
) {
  try {
    return await db().session.update({
      where: { id },
      data: { refreshTokenHash, lastUsedAt: new Date() },
    });
  } catch {
    const s = memStore.sessions.get(id);
    if (s) {
      s.refreshTokenHash = refreshTokenHash;
      s.lastUsedAt = new Date();
    }
    return s as any;
  }
}

export async function pruneExpiredSessions() {
  try {
    return await db().session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    const now = new Date();
    let count = 0;
    for (const [id, s] of memStore.sessions.entries()) {
      if (s.expiresAt < now) {
        memStore.sessions.delete(id);
        count++;
      }
    }
    return { count } as any;
  }
}
