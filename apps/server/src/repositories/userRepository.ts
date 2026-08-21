import type { Prisma } from '@prisma/client';
import { getPrismaClient } from './prisma';
import { memStore } from './memFallback';
import crypto from 'node:crypto';

const db = () => getPrismaClient();

export const safeUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatar: true,
  role: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastSeenAt: true,
} as const;

export async function findUserById(id: string) {
  try {
    return await db().user.findUnique({ where: { id }, select: safeUserSelect });
  } catch {
    const u = memStore.users.get(id);
    if (!u) return null;
    const { passwordHash, ...rest } = u;
    return rest as any;
  }
}

export async function findUserByEmail(email: string) {
  const norm = email.toLowerCase().trim();
  try {
    return await db().user.findUnique({ where: { email: norm } });
  } catch {
    for (const u of memStore.users.values()) {
      if (u.email.toLowerCase() === norm) return u as any;
    }
    return null;
  }
}

export async function findUserByUsername(username: string) {
  const norm = username.toLowerCase().trim();
  try {
    return await db().user.findUnique({ where: { username: norm } });
  } catch {
    for (const u of memStore.users.values()) {
      if (u.username.toLowerCase() === norm) return u as any;
    }
    return null;
  }
}

export async function findUserByIdentifier(identifier: string) {
  const lower = identifier.toLowerCase().trim();
  try {
    return await db().user.findFirst({
      where: {
        OR: [{ email: lower }, { username: lower }],
      },
    });
  } catch {
    for (const u of memStore.users.values()) {
      if (u.email.toLowerCase() === lower || u.username.toLowerCase() === lower) {
        return u as any;
      }
    }
    return null;
  }
}

export async function createUser(data: {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatar?: string | null;
}) {
  try {
    return await db().user.create({
      data: {
        ...data,
        username: data.username.toLowerCase().trim(),
        email: data.email.toLowerCase().trim(),
      },
      select: safeUserSelect,
    });
  } catch {
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newUser = {
      id,
      username: data.username.toLowerCase().trim(),
      displayName: data.displayName.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      isActive: true,
      avatar: data.avatar || null,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
    memStore.users.set(id, newUser);
    const { passwordHash, ...rest } = newUser;
    return rest as any;
  }
}

export async function updateUser(
  id: string,
  data: Prisma.UserUpdateInput
) {
  try {
    return await db().user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  } catch {
    const u = memStore.users.get(id);
    if (!u) return null;
    Object.assign(u, data);
    u.updatedAt = new Date();
    const { passwordHash, ...rest } = u;
    return rest as any;
  }
}

export async function updateLastSeen(id: string) {
  try {
    return await db().user.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    const u = memStore.users.get(id);
    if (u) u.lastSeenAt = new Date();
    return u as any;
  }
}
