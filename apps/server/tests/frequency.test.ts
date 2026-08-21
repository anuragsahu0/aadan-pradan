/**
 * Phase 4 Virtual Frequency & Concurrency Tests
 *
 * Tests all frequency endpoints, 40-user hard limit enforcement,
 * and concurrent race-condition protections using supertest.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';
import { signAccessToken } from '../src/services/tokenService';

// ─── In-Memory Mock Database for Concurrency Testing ──────────────────────────

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockFrequencies: Record<string, any> = {};
const mockMemberships: Record<string, any> = {};

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

// Atomic lock simulator for in-memory transaction testing
let txLock = Promise.resolve();

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return mockUsers[where.id] ?? null;
      if (where.email) return Object.values(mockUsers).find((u: any) => u.email === where.email) ?? null;
      if (where.username) return Object.values(mockUsers).find((u: any) => u.username === where.username) ?? null;
      return null;
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      const lower = where.OR?.[0]?.email ?? '';
      return Object.values(mockUsers).find((u: any) => u.email === lower || u.username === lower) ?? null;
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const user = { id, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSeenAt: null };
      mockUsers[id] = user;
      return user;
    }),
  },
  session: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return mockSessions[where.id] ?? null;
      return null;
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const session = { id, ...data, createdAt: new Date(), lastUsedAt: new Date(), revokedAt: null };
      mockSessions[id] = session;
      return session;
    }),
  },
  frequency: {
    findUnique: vi.fn(async ({ where, include }: any) => {
      const freq = mockFrequencies[where.frequencyCode] || Object.values(mockFrequencies).find((f: any) => f.id === where.id);
      if (!freq) return null;
      if (include?.memberships) {
        const mems = Object.values(mockMemberships)
          .filter((m: any) => m.frequencyId === freq.id && m.status === 'ACTIVE')
          .map((m: any) => ({
            ...m,
            user: mockUsers[m.userId] || { id: m.userId, username: 'operator', displayName: 'Operator', avatar: null, isActive: true },
          }));
        return { ...freq, memberships: mems };
      }
      return freq;
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = `freq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const freq = { id, maxUsers: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastActiveAt: new Date(), ...data };
      mockFrequencies[freq.frequencyCode] = freq;
      return freq;
    }),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      let freq = mockFrequencies[where.frequencyCode];
      if (!freq) {
        const id = `freq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        freq = { id, maxUsers: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastActiveAt: new Date(), ...create };
        mockFrequencies[freq.frequencyCode] = freq;
      } else {
        freq = { ...freq, ...update, updatedAt: new Date() };
        mockFrequencies[freq.frequencyCode] = freq;
      }
      return freq;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const key = Object.keys(mockFrequencies).find((k) => mockFrequencies[k].id === where.id || k === where.frequencyCode);
      if (key && mockFrequencies[key]) {
        mockFrequencies[key] = { ...mockFrequencies[key], ...data, updatedAt: new Date() };
        return mockFrequencies[key];
      }
      return null;
    }),
  },
  frequencyMembership: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.userId_frequencyId) {
        const { userId, frequencyId } = where.userId_frequencyId;
        const key = `${userId}_${frequencyId}`;
        return mockMemberships[key] ?? null;
      }
      return null;
    }),
    count: vi.fn(async ({ where }: any) => {
      return Object.values(mockMemberships).filter(
        (m: any) => m.frequencyId === where.frequencyId && (where.status ? m.status === where.status : true)
      ).length;
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const key = `${data.userId}_${data.frequencyId}`;
      const mem = { id, ...data, joinedAt: new Date(), lastSeenAt: new Date() };
      mockMemberships[key] = mem;
      return mem;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const mem = Object.values(mockMemberships).find((m: any) => m.id === where.id);
      if (mem) {
        Object.assign(mem, data);
        return mem;
      }
      return null;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      Object.values(mockMemberships).forEach((m: any) => {
        if (m.frequencyId === where.frequencyId && m.userId === where.userId && (where.status ? m.status === where.status : true)) {
          Object.assign(m, data);
          count++;
        }
      });
      return { count };
    }),
    findMany: vi.fn(async ({ where, include, take }: any) => {
      const mems = Object.values(mockMemberships).filter((m: any) => m.userId === where.userId);
      return mems.slice(0, take || 10).map((m: any) => {
        const freq = Object.values(mockFrequencies).find((f: any) => f.id === m.frequencyId) || { frequencyCode: '145.800' };
        return { ...m, frequency: freq };
      });
    }),
  },
  $transaction: vi.fn(async (cb: any) => {
    // Atomic sequential execution representing DB transaction isolation
    const nextLock = txLock.then(async () => {
      return cb(mockPrismaClient);
    });
    txLock = nextLock.catch(() => {});
    return nextLock;
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const app = createExpressApp();

function clearAllMockData() {
  Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
  Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
  Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
  Object.keys(mockMemberships).forEach((k) => delete mockMemberships[k]);
}

function createMockAuthUser(customId?: string) {
  const userId = customId || `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  mockUsers[userId] = {
    id: userId,
    username: `op_${userId.substring(4, 10)}`,
    displayName: `Operator ${userId.substring(4, 10)}`,
    email: `${userId}@aadanpradan.io`,
    passwordHash: 'hash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
  };

  mockSessions[sessionId] = {
    id: sessionId,
    userId,
    refreshTokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    lastUsedAt: new Date(),
    revokedAt: null,
  };

  const token = signAccessToken(userId, sessionId);
  return { userId, sessionId, token };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Phase 4 — Virtual Frequency REST API', () => {
  beforeEach(clearAllMockData);

  describe('GET /api/frequencies/:frequencyCode', () => {
    it('should return availability info for a valid virtual frequency', async () => {
      const res = await request(app).get('/api/frequencies/145.800');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.frequencyCode).toBe('145.800');
      expect(res.body.data.maxUsers).toBe(40);
      expect(res.body.data.userCount).toBe(0);
      expect(res.body.data.status).toBe('AVAILABLE');
    });

    it('should reject malformed virtual frequency codes', async () => {
      const res = await request(app).get('/api/frequencies/abc.def');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/frequencies', () => {
    it('should create a new virtual frequency when authenticated', async () => {
      const { token } = createMockAuthUser();
      const res = await request(app)
        .post('/api/frequencies')
        .set('Authorization', `Bearer ${token}`)
        .send({ frequencyCode: '146.520', name: 'TACTICAL CHANNEL ALPHA' });

      expect(res.status).toBe(201);
      expect(res.body.data.frequencyCode).toBe('146.520');
      expect(res.body.data.maxUsers).toBe(40);
    });

    it('should reject unauthenticated frequency creation', async () => {
      const res = await request(app)
        .post('/api/frequencies')
        .send({ frequencyCode: '146.520' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/frequencies/:frequencyCode/join & leave', () => {
    it('should join an available frequency and increment count', async () => {
      const { token, userId } = createMockAuthUser();
      const res = await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.joined).toBe(true);
      expect(res.body.data.userCount).toBe(1);
      expect(res.body.data.maxUsers).toBe(40);
      expect(res.body.data.status).toBe('CONNECTED');
    });

    it('should be idempotent if the same user joins repeatedly', async () => {
      const { token } = createMockAuthUser();

      // First join
      const res1 = await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.body.data.userCount).toBe(1);

      // Second join
      const res2 = await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.userCount).toBe(1); // Not duplicated
    });

    it('should allow user to leave and free up occupancy slot', async () => {
      const { token } = createMockAuthUser();

      await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${token}`);

      const leaveRes = await request(app)
        .post('/api/frequencies/145.800/leave')
        .set('Authorization', `Bearer ${token}`);

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.data.left).toBe(true);
      expect(leaveRes.body.data.userCount).toBe(0);
    });
  });

  describe('Hard 40-User Limit Enforcement', () => {
    it('should allow exactly 40 users and reject the 41st user with FREQUENCY_FULL (422)', async () => {
      // 1. Join 40 unique users
      for (let i = 1; i <= 40; i++) {
        const { token } = createMockAuthUser(`usr_batch_${i}`);
        const res = await request(app)
          .post('/api/frequencies/145.800/join')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.userCount).toBe(i);
      }

      // Verify frequency status is now FULL
      const lookupRes = await request(app).get('/api/frequencies/145.800');
      expect(lookupRes.body.data.userCount).toBe(40);
      expect(lookupRes.body.data.status).toBe('FULL');

      // 2. Attempt 41st user join -> MUST BE REJECTED
      const user41 = createMockAuthUser('usr_batch_41');
      const res41 = await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${user41.token}`);

      expect(res41.status).toBe(422);
      expect(res41.body.success).toBe(false);
      expect(res41.body.error.code).toBe('FREQUENCY_FULL');
      expect(res41.body.error.message).toContain('full');

      // Verify occupancy remains strictly 40
      const finalLookup = await request(app).get('/api/frequencies/145.800');
      expect(finalLookup.body.data.userCount).toBe(40);
    });
  });

  describe('Requirement #30: Crucial Concurrency Test', () => {
    it('should safely handle 5 simultaneous joins at 39/40 capacity: exactly 1 succeeds, 4 fail with FREQUENCY_FULL, final count = 40', async () => {
      // 1. Pre-fill channel with 39 active users
      for (let i = 1; i <= 39; i++) {
        const { token } = createMockAuthUser(`usr_concurrent_${i}`);
        await request(app)
          .post('/api/frequencies/433.500/join')
          .set('Authorization', `Bearer ${token}`);
      }

      // Check current capacity is 39/40
      const checkRes = await request(app).get('/api/frequencies/433.500');
      expect(checkRes.body.data.userCount).toBe(39);

      // 2. Create 5 new distinct users attempting to join at the exact same moment
      const candidateUsers = [
        createMockAuthUser('usr_race_1'),
        createMockAuthUser('usr_race_2'),
        createMockAuthUser('usr_race_3'),
        createMockAuthUser('usr_race_4'),
        createMockAuthUser('usr_race_5'),
      ];

      // Fire all 5 join requests simultaneously
      const results = await Promise.all(
        candidateUsers.map((u) =>
          request(app)
            .post('/api/frequencies/433.500/join')
            .set('Authorization', `Bearer ${u.token}`)
        )
      );

      // 3. Count successes vs rejections
      const successfulJoins = results.filter((r) => r.status === 200);
      const rejectedJoins = results.filter((r) => r.status === 422);

      expect(successfulJoins.length).toBe(1);
      expect(rejectedJoins.length).toBe(4);

      // Verify each rejected request received FREQUENCY_FULL
      rejectedJoins.forEach((rej) => {
        expect(rej.body.error.code).toBe('FREQUENCY_FULL');
      });

      // 4. Final verification: active member count must be EXACTLY 40 (never 41+)
      const finalRes = await request(app).get('/api/frequencies/433.500');
      expect(finalRes.body.data.userCount).toBe(40);
      expect(finalRes.body.data.status).toBe('FULL');
    });
  });

  describe('GET /api/frequencies/:frequencyCode/users', () => {
    it('should return the safe active user listing', async () => {
      const userA = createMockAuthUser('usr_list_a');
      const userB = createMockAuthUser('usr_list_b');

      await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${userA.token}`);

      await request(app)
        .post('/api/frequencies/145.800/join')
        .set('Authorization', `Bearer ${userB.token}`);

      const res = await request(app)
        .get('/api/frequencies/145.800/users')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(2);
      expect(res.body.data.users.length).toBe(2);
      expect(res.body.data.users[0].username).toBeDefined();
      expect(res.body.data.users[0].passwordHash).toBeUndefined();
    });
  });
});
