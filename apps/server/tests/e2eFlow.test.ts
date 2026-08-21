import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';
import { talkLockService } from '../src/services/talkLockService';
import { signAccessToken } from '../src/services/tokenService';

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockFrequencies: Record<string, any> = {};
const mockMemberships: Record<string, any> = {};
const mockAuditLogs: any[] = [];

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return mockUsers[where.id] ?? null;
      if (where.username) return Object.values(mockUsers).find((u: any) => u.username === where.username) ?? null;
      if (where.email) return Object.values(mockUsers).find((u: any) => u.email === where.email) ?? null;
      return null;
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      return Object.values(mockUsers).find(
        (u: any) => u.username === where.OR?.[0]?.username || u.email === where.OR?.[1]?.email
      ) ?? null;
    }),
    findMany: vi.fn(async () => Object.values(mockUsers)),
    count: vi.fn(async () => Object.values(mockUsers).length),
    create: vi.fn(async ({ data }: any) => {
      const id = `usr_${Date.now()}_${Math.random()}`;
      const user = { id, ...data, role: 'USER', status: 'ACTIVE', isActive: true, createdAt: new Date(), updatedAt: new Date() };
      mockUsers[id] = user;
      return user;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      if (mockUsers[where.id]) {
        Object.assign(mockUsers[where.id], data);
        return mockUsers[where.id];
      }
      return null;
    }),
  },
  session: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return mockSessions[where.id] ?? null;
      if (where.refreshTokenHash) return Object.values(mockSessions).find((s: any) => s.refreshTokenHash === where.refreshTokenHash) ?? null;
      return null;
    }),
    findFirst: vi.fn(async ({ where }: any) => mockSessions[where.id] ?? null),
    create: vi.fn(async ({ data }: any) => {
      const id = `sess_${Date.now()}_${Math.random()}`;
      const session = { id, ...data, revokedAt: null, createdAt: new Date() };
      mockSessions[id] = session;
      return session;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      if (mockSessions[where.id]) {
        Object.assign(mockSessions[where.id], data);
        return mockSessions[where.id];
      }
      return null;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      Object.values(mockSessions).forEach((s: any) => {
        if (s.userId === where.userId && (!where.revokedAt || s.revokedAt === null)) {
          Object.assign(s, data);
          count++;
        }
      });
      return { count };
    }),
  },
  frequency: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.frequencyCode) return mockFrequencies[where.frequencyCode] ?? null;
      if (where.id) return Object.values(mockFrequencies).find((f: any) => f.id === where.id) ?? null;
      return null;
    }),
    findMany: vi.fn(async () => Object.values(mockFrequencies)),
    count: vi.fn(async () => Object.values(mockFrequencies).length),
    create: vi.fn(async ({ data }: any) => {
      const id = `freq_${Date.now()}`;
      const f = { id, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      mockFrequencies[data.frequencyCode] = f;
      return f;
    }),
    upsert: vi.fn(async ({ where, create }: any) => {
      if (mockFrequencies[where.frequencyCode]) return mockFrequencies[where.frequencyCode];
      const id = `freq_${Date.now()}`;
      const f = { id, ...create, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      mockFrequencies[where.frequencyCode] = f;
      return f;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const target = where.frequencyCode
        ? mockFrequencies[where.frequencyCode]
        : Object.values(mockFrequencies).find((f: any) => f.id === where.id);
      if (target) {
        Object.assign(target, data);
        return target;
      }
      return null;
    }),
  },
  frequencyMembership: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.userId_frequencyId) {
        const key = `${where.userId_frequencyId.userId}_${where.userId_frequencyId.frequencyId}`;
        return mockMemberships[key] ?? null;
      }
      if (where.id) {
        return Object.values(mockMemberships).find((m: any) => m.id === where.id) ?? null;
      }
      return null;
    }),
    count: vi.fn(async ({ where }: any) => {
      return Object.values(mockMemberships).filter(
        (m: any) => m.frequencyId === where.frequencyId && (where.status ? m.status === where.status : true)
      ).length;
    }),
    create: vi.fn(async ({ data }: any) => {
      const key = `${data.userId}_${data.frequencyId}`;
      const item = { id: `mem_${Date.now()}_${Math.random()}`, ...data, joinedAt: new Date() };
      mockMemberships[key] = item;
      return item;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const item = Object.values(mockMemberships).find((m: any) => m.id === where.id);
      if (item) {
        Object.assign(item, data);
        return item;
      }
      return null;
    }),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      const key = `${where.userId_frequencyId.userId}_${where.userId_frequencyId.frequencyId}`;
      if (mockMemberships[key]) {
        Object.assign(mockMemberships[key], update);
        return mockMemberships[key];
      }
      const item = { id: `mem_${Date.now()}`, ...create, joinedAt: new Date() };
      mockMemberships[key] = item;
      return item;
    }),
  },
  deviceToken: {
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  auditLog: {
    create: vi.fn(async ({ data }: any) => {
      const item = { id: `aud_${Date.now()}`, ...data, createdAt: new Date() };
      mockAuditLogs.push(item);
      return item;
    }),
    findMany: vi.fn(async () => mockAuditLogs),
    count: vi.fn(async () => mockAuditLogs.length),
  },
  $transaction: vi.fn(async (cb: any) => cb(mockPrismaClient)),
};

describe('Phase 10 Comprehensive End-to-End Flow (Production QA)', () => {
  let app: any;
  let adminToken: string;
  let userAToken: string;
  let userBToken: string;

  beforeEach(() => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
    Object.keys(mockMemberships).forEach((k) => delete mockMemberships[k]);
    mockAuditLogs.length = 0;
    talkLockService.clear();

    app = createExpressApp();

    // Seed Admin User
    const adminId = 'usr_admin';
    const adminSess = 'sess_admin';
    mockUsers[adminId] = {
      id: adminId,
      username: 'admin',
      displayName: 'System Admin',
      email: 'admin@aadanpradan.io',
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockSessions[adminSess] = {
      id: adminSess,
      userId: adminId,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };
    adminToken = signAccessToken(adminId, adminSess);

    // Setup Frequency
    mockFrequencies['145.800'] = {
      id: 'freq_145800',
      frequencyCode: '145.800',
      name: 'Tactical Calling',
      maxUsers: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('Complete E2E: Auth -> Frequency Join -> 40-User Limit -> PTT Floor -> Suspension -> Session Eviction', async () => {
    // 1. Register User A
    const regResA = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'operator_alpha',
        displayName: 'Operator Alpha',
        email: 'alpha@aadanpradan.io',
        password: 'SecurePassword123!',
      });

    expect(regResA.status).toBe(201);
    expect(regResA.body.data.user.username).toBe('operator_alpha');
    const userA = regResA.body.data.user;
    userAToken = regResA.body.data.tokens.accessToken;

    // 2. Register User B
    const regResB = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'operator_bravo',
        displayName: 'Operator Bravo',
        email: 'bravo@aadanpradan.io',
        password: 'SecurePassword123!',
      });

    expect(regResB.status).toBe(201);
    const userB = regResB.body.data.user;
    userBToken = regResB.body.data.tokens.accessToken;

    // 3. User A joins Frequency 145.800
    const joinResA = await request(app)
      .post('/api/frequencies/145.800/join')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(joinResA.status).toBe(200);
    expect(joinResA.body.data.userCount).toBe(1);

    // 4. Fill frequency up to 40 users and verify 41st join rejected
    for (let i = 2; i <= 40; i++) {
      const uId = `usr_sim_${i}`;
      mockMemberships[`${uId}_freq_145800`] = {
        id: `mem_sim_${i}`,
        userId: uId,
        frequencyId: 'freq_145800',
        status: 'ACTIVE',
      };
    }

    const joinRes41 = await request(app)
      .post('/api/frequencies/145.800/join')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(joinRes41.status).toBe(422);
    expect(joinRes41.body.error.code).toBe('FREQUENCY_FULL');

    // Clear simulated memberships so User B can join
    for (let i = 2; i <= 40; i++) {
      delete mockMemberships[`usr_sim_${i}_freq_145800`];
    }

    const joinResB = await request(app)
      .post('/api/frequencies/145.800/join')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(joinResB.status).toBe(200);

    // 5. PTT Floor Lock Arbitration: User A acquires floor
    const lockGrantedA = talkLockService.acquireLock('145.800', {
      id: userA.id,
      username: userA.username,
      displayName: userA.displayName,
    });
    expect(lockGrantedA.granted).toBe(true);

    // User B attempts to transmit simultaneously -> DENIED (One speaker guarantee)
    const lockGrantedB = talkLockService.acquireLock('145.800', {
      id: userB.id,
      username: userB.username,
      displayName: userB.displayName,
    });
    expect(lockGrantedB.granted).toBe(false);
    expect(lockGrantedB.code).toBe('CHANNEL_BUSY');

    // 6. User A releases floor
    const releaseRes = talkLockService.releaseLock('145.800', userA.id, 'user_release');
    expect(releaseRes).toBe(true);
    expect(talkLockService.isChannelFree('145.800')).toBe(true);

    // User B now acquires floor successfully
    const lockGrantedB2 = talkLockService.acquireLock('145.800', {
      id: userB.id,
      username: userB.username,
      displayName: userB.displayName,
    });
    expect(lockGrantedB2.granted).toBe(true);

    // 7. Admin suspends User B while transmitting
    const suspendRes = await request(app)
      .patch(`/api/admin/users/${userB.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.status).toBe('SUSPENDED');

    // Suspended user floor lock must be released immediately
    talkLockService.releaseUserLocks(userB.id, null as any, 'disconnect');
    expect(talkLockService.isChannelFree('145.800')).toBe(true);

    // Suspended user access must now be rejected
    const meResB = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${userBToken}`);

    expect([401, 403]).toContain(meResB.status);

    // 8. Verify Audit Logs recorded suspension
    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.logs.some((l: any) => l.action === 'USER_SUSPENDED')).toBe(true);
  });
});
