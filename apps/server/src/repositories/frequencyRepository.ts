import { getPrismaClient } from './prisma';
import { memStore } from './memFallback';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import { FrequencyFullError } from '../utils/appError';
import type { FrequencyUserSummary } from '@aadan-pradan/types';

const db = () => getPrismaClient();

export async function findFrequencyByCode(frequencyCode: string) {
  try {
    return await db().frequency.findUnique({
      where: { frequencyCode },
    });
  } catch {
    return (memStore.frequencies.get(frequencyCode) || null) as any;
  }
}

export async function findOrCreateFrequency(frequencyCode: string, name?: string) {
  try {
    return await db().frequency.upsert({
      where: { frequencyCode },
      create: {
        frequencyCode,
        name: name || `VIRTUAL CHANNEL ${frequencyCode}`,
        maxUsers: MAX_USERS_PER_FREQUENCY,
        isActive: true,
        lastActiveAt: new Date(),
      },
      update: {
        lastActiveAt: new Date(),
      },
    });
  } catch {
    let freq = memStore.frequencies.get(frequencyCode);
    if (!freq) {
      freq = {
        id: `freq_${frequencyCode.replace('.', '')}`,
        frequencyCode,
        name: name || `VIRTUAL CHANNEL ${frequencyCode}`,
        maxUsers: MAX_USERS_PER_FREQUENCY,
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
      memStore.frequencies.set(frequencyCode, freq);
    }
    return freq as any;
  }
}

export async function getActiveMemberCount(frequencyId: string): Promise<number> {
  try {
    return await db().frequencyMembership.count({
      where: {
        frequencyId,
        status: 'ACTIVE',
      },
    });
  } catch {
    let count = 0;
    for (const m of memStore.memberships.values()) {
      if (m.frequencyId === frequencyId && m.status === 'ACTIVE') count++;
    }
    return count;
  }
}

export async function joinFrequencyAtomic(
  frequencyCode: string,
  userId: string,
  maxUsers: number = MAX_USERS_PER_FREQUENCY
): Promise<{
  frequency: { id: string; frequencyCode: string; name: string | null; maxUsers: number };
  userCount: number;
  isNewJoin: boolean;
}> {
  try {
    return await db().$transaction(async (tx) => {
      let freq = await tx.frequency.findUnique({
        where: { frequencyCode },
      });

      if (!freq) {
        freq = await tx.frequency.create({
          data: {
            frequencyCode,
            name: `VIRTUAL CHANNEL ${frequencyCode}`,
            maxUsers,
            isActive: true,
            lastActiveAt: new Date(),
          },
        });
      }

      const existingMembership = await tx.frequencyMembership.findUnique({
        where: {
          userId_frequencyId: {
            userId,
            frequencyId: freq.id,
          },
        },
      });

      const currentActiveCount = await tx.frequencyMembership.count({
        where: {
          frequencyId: freq.id,
          status: 'ACTIVE',
        },
      });

      if (existingMembership && existingMembership.status === 'ACTIVE') {
        await tx.frequencyMembership.update({
          where: { id: existingMembership.id },
          data: { lastSeenAt: new Date() },
        });

        return {
          frequency: freq,
          userCount: currentActiveCount,
          isNewJoin: false,
        };
      }

      if (currentActiveCount >= maxUsers) {
        throw new FrequencyFullError(
          `Virtual frequency ${frequencyCode} is full (${currentActiveCount}/${maxUsers} operators connected).`
        );
      }

      if (existingMembership) {
        await tx.frequencyMembership.update({
          where: { id: existingMembership.id },
          data: {
            status: 'ACTIVE',
            joinedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
      } else {
        await tx.frequencyMembership.create({
          data: {
            userId,
            frequencyId: freq.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
      }

      await tx.frequency.update({
        where: { id: freq.id },
        data: { lastActiveAt: new Date() },
      });

      return {
        frequency: freq,
        userCount: currentActiveCount + 1,
        isNewJoin: true,
      };
    });
  } catch (err: any) {
    if (err instanceof FrequencyFullError) throw err;

    // In-memory atomic fallback
    let freq = memStore.frequencies.get(frequencyCode);
    if (!freq) {
      freq = {
        id: `freq_${frequencyCode.replace('.', '')}`,
        frequencyCode,
        name: `VIRTUAL CHANNEL ${frequencyCode}`,
        maxUsers,
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
      memStore.frequencies.set(frequencyCode, freq);
    }

    const membershipKey = `${userId}_${freq.id}`;
    const existing = memStore.memberships.get(membershipKey);

    let activeCount = 0;
    for (const m of memStore.memberships.values()) {
      if (m.frequencyId === freq.id && m.status === 'ACTIVE') activeCount++;
    }

    if (existing && existing.status === 'ACTIVE') {
      return {
        frequency: freq,
        userCount: activeCount,
        isNewJoin: false,
      };
    }

    if (activeCount >= maxUsers) {
      throw new FrequencyFullError(
        `Virtual frequency ${frequencyCode} is full (${activeCount}/${maxUsers} operators connected).`
      );
    }

    memStore.memberships.set(membershipKey, {
      id: `mem_${membershipKey}`,
      frequencyId: freq.id,
      userId,
      status: 'ACTIVE',
      joinedAt: new Date(),
      leftAt: null,
    });

    return {
      frequency: freq,
      userCount: activeCount + 1,
      isNewJoin: true,
    };
  }
}

export async function leaveFrequency(
  frequencyCode: string,
  userId: string
): Promise<{ frequencyCode: string; remainingCount: number }> {
  try {
    const freq = await db().frequency.findUnique({
      where: { frequencyCode },
    });

    if (!freq) return { frequencyCode, remainingCount: 0 };

    await db().frequencyMembership.updateMany({
      where: {
        frequencyId: freq.id,
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'LEFT',
        lastSeenAt: new Date(),
      },
    });

    const remainingCount = await db().frequencyMembership.count({
      where: {
        frequencyId: freq.id,
        status: 'ACTIVE',
      },
    });

    return { frequencyCode, remainingCount };
  } catch {
    const freq = memStore.frequencies.get(frequencyCode);
    if (!freq) return { frequencyCode, remainingCount: 0 };

    const membershipKey = `${userId}_${freq.id}`;
    const mem = memStore.memberships.get(membershipKey);
    if (mem) {
      mem.status = 'INACTIVE';
      mem.leftAt = new Date();
    }

    let remainingCount = 0;
    for (const m of memStore.memberships.values()) {
      if (m.frequencyId === freq.id && m.status === 'ACTIVE') remainingCount++;
    }

    return { frequencyCode, remainingCount };
  }
}

export async function getActiveUsersInFrequency(
  frequencyCode: string
): Promise<FrequencyUserSummary[]> {
  try {
    const freq = await db().frequency.findUnique({
      where: { frequencyCode },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isActive: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!freq) return [];

    return freq.memberships.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatar: m.user.avatar,
      status: 'online',
      isOnline: true,
      joinedAt: m.joinedAt.toISOString(),
    }));
  } catch {
    const freq = memStore.frequencies.get(frequencyCode);
    if (!freq) return [];

    const activeUsers: FrequencyUserSummary[] = [];
    for (const m of memStore.memberships.values()) {
      if (m.frequencyId === freq.id && m.status === 'ACTIVE') {
        const u = memStore.users.get(m.userId);
        if (u) {
          activeUsers.push({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar,
            status: 'online',
            isOnline: true,
            joinedAt: m.joinedAt.toISOString(),
          });
        }
      }
    }
    return activeUsers;
  }
}

export async function getUserRecentFrequencies(userId: string): Promise<string[]> {
  try {
    const memberships = await db().frequencyMembership.findMany({
      where: { userId },
      include: {
        frequency: {
          select: { frequencyCode: true },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 8,
    });

    return Array.from(new Set(memberships.map((m) => m.frequency.frequencyCode)));
  } catch {
    return ['145.800', '144.200', '433.500'];
  }
}
