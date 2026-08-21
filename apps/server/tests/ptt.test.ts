/**
 * Phase 7 Push-to-Talk Engine, Talk Lock & Concurrency Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { createExpressApp } from '../src/server';
import { initializeSocketServer } from '../src/sockets/socketServer';
import { signAccessToken } from '../src/services/tokenService';
import { presenceService } from '../src/services/presenceService';
import { talkLockService } from '../src/services/talkLockService';

// ─── Mock Database ────────────────────────────────────────────────────────────

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockFrequencies: Record<string, any> = {};
const mockMemberships: Record<string, any> = {};

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return mockUsers[where.id] ?? null;
      return null;
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
      return null;
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
    update: vi.fn(async ({ where, data }: any) => {
      const key = Object.keys(mockFrequencies).find((k) => mockFrequencies[k].id === where.id || k === where.frequencyCode);
      if (key && mockFrequencies[key]) {
        Object.assign(mockFrequencies[key], data);
        return mockFrequencies[key];
      }
      return null;
    }),
  },
  frequencyMembership: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.userId_frequencyId) {
        const { userId, frequencyId } = where.userId_frequencyId;
        return mockMemberships[`${userId}_${frequencyId}`] ?? null;
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
  },
  $transaction: vi.fn(async (cb: any) => cb(mockPrismaClient)),
};

// ─── Setup ────────────────────────────────────────────────────────────────────

let httpServer: HttpServer;
let port: number;
let ioServer: any;
const activeClientSockets: ClientSocket[] = [];

function createTestUser(id: string, name: string) {
  const sessionId = `sess_${id}`;
  mockUsers[id] = {
    id,
    username: id.toLowerCase(),
    displayName: name,
    email: `${id}@aadanpradan.io`,
    passwordHash: 'hash',
    isActive: true,
  };
  mockSessions[sessionId] = {
    id: sessionId,
    userId: id,
    refreshTokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
  };
  const token = signAccessToken(id, sessionId);
  return { id, sessionId, token };
}

function connectClientSocket(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    client.on('connect', () => {
      activeClientSockets.push(client);
      resolve(client);
    });

    client.on('connect_error', reject);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Phase 7 — Real Push-to-Talk System & Talk Lock', () => {
  beforeEach(async () => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
    Object.keys(mockMemberships).forEach((k) => delete mockMemberships[k]);
    presenceService.clear();
    talkLockService.clear();

    const app = createExpressApp();
    httpServer = createServer(app);
    ioServer = initializeSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port = typeof address === 'object' && address ? address.port : 5001;
        resolve();
      });
    });
  });

  afterEach(async () => {
    activeClientSockets.forEach((s) => s.close());
    activeClientSockets.length = 0;
    talkLockService.clear();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  describe('Floor Request & Release Lifecycle', () => {
    it('should grant floor to single user and broadcast state as ACTIVE, then release on ptt:release', async () => {
      const userA = createTestUser('usr_anurag', 'Anurag');
      const userB = createTestUser('usr_rahul', 'Rahul');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      // Both join 145.800
      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));

      const bPttStates: any[] = [];
      clientB.on('ptt:state', (s) => bPttStates.push(s));

      // 1. User A requests floor
      const reqRes = await new Promise<any>((resolve) => {
        clientA.emit('ptt:request', { frequencyCode: '145.800' }, resolve);
      });

      expect(reqRes.granted).toBe(true);
      expect(reqRes.state.state).toBe('ACTIVE');
      expect(reqRes.state.speaker.id).toBe('usr_anurag');

      await new Promise((r) => setTimeout(r, 60));

      // User B must receive ACTIVE state
      const activeState = bPttStates[bPttStates.length - 1];
      expect(activeState).toBeDefined();
      expect(activeState.state).toBe('ACTIVE');
      expect(activeState.speaker.id).toBe('usr_anurag');

      // 2. User A releases floor
      clientA.emit('ptt:release', { frequencyCode: '145.800' });
      await new Promise((r) => setTimeout(r, 60));

      // User B must receive FREE state
      const freeState = bPttStates[bPttStates.length - 1];
      expect(freeState.state).toBe('FREE');
      expect(freeState.speaker).toBeNull();
    });
  });

  describe('One Active Speaker & Channel Busy Denial', () => {
    it('should deny floor request with CHANNEL_BUSY when another user is already talking', async () => {
      const userA = createTestUser('usr_anurag', 'Anurag');
      const userB = createTestUser('usr_rahul', 'Rahul');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));

      // User A acquires lock
      await new Promise<any>((r) => clientA.emit('ptt:request', { frequencyCode: '145.800' }, r));

      // User B attempts to acquire lock while A is talking -> DENIED
      const bDeniedEvents: any[] = [];
      clientB.on('ptt:denied', (d) => bDeniedEvents.push(d));

      const bReq = await new Promise<any>((resolve) => {
        clientB.emit('ptt:request', { frequencyCode: '145.800' }, resolve);
      });

      expect(bReq.granted).toBe(false);
      expect(bReq.error).toContain('Channel is currently busy');

      await new Promise((r) => setTimeout(r, 50));
      expect(bDeniedEvents.length).toBe(1);
      expect(bDeniedEvents[0].code).toBe('CHANNEL_BUSY');
      expect(bDeniedEvents[0].currentSpeaker.id).toBe('usr_anurag');
    });
  });

  describe('Crucial Concurrency & Race Condition Test', () => {
    it('should grant floor to exactly ONE user and deny the other 9 when 10 users press PTT simultaneously', async () => {
      const clients: ClientSocket[] = [];

      // Create 10 users and connect sockets
      for (let i = 1; i <= 10; i++) {
        const u = createTestUser(`usr_race_${i}`, `Operator ${i}`);
        const c = await connectClientSocket(u.token);
        await new Promise<void>((r) => c.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
        clients.push(c);
      }

      // Fire 10 simultaneous PTT requests
      const results = await Promise.all(
        clients.map(
          (c) =>
            new Promise<any>((resolve) => {
              c.emit('ptt:request', { frequencyCode: '145.800' }, resolve);
            })
        )
      );

      const granted = results.filter((r) => r.granted === true);
      const denied = results.filter((r) => r.granted === false);

      expect(granted.length).toBe(1);
      expect(denied.length).toBe(9);

      // Verify that the floor has strictly 1 active speaker
      const currentSpeaker = talkLockService.getCurrentSpeaker('145.800');
      expect(currentSpeaker).not.toBeNull();
      expect(currentSpeaker?.id).toBe(granted[0].state.speaker.id);
    });
  });

  describe('Auto-Expiration & Lock Timeout', () => {
    it('should automatically release talk lock after timeout duration', async () => {
      const userA = createTestUser('usr_anurag', 'Anurag');
      const userB = createTestUser('usr_rahul', 'Rahul');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));

      // Acquire lock with short test duration (60ms)
      const speakerInfo = { id: 'usr_anurag', username: 'anurag', displayName: 'Anurag' };
      talkLockService.acquireLock('145.800', speakerInfo, clientA.id, ioServer, 60);

      expect(talkLockService.getCurrentSpeaker('145.800')).not.toBeNull();

      // Wait 100ms for timeout to expire
      await new Promise((r) => setTimeout(r, 100));

      // Lock must now be automatically released
      expect(talkLockService.getCurrentSpeaker('145.800')).toBeNull();
      expect(talkLockService.getPttState('145.800').state).toBe('FREE');

      // User B can now acquire floor
      const bRes = await new Promise<any>((resolve) => {
        clientB.emit('ptt:request', { frequencyCode: '145.800' }, resolve);
      });
      expect(bRes.granted).toBe(true);
    });
  });

  describe('Disconnect Cleanup & Frequency Isolation', () => {
    it('should release talk lock when active speaker disconnects', async () => {
      const userA = createTestUser('usr_anurag', 'Anurag');
      const userB = createTestUser('usr_rahul', 'Rahul');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));

      // User A acquires lock
      await new Promise<any>((r) => clientA.emit('ptt:request', { frequencyCode: '145.800' }, r));
      expect(talkLockService.getCurrentSpeaker('145.800')?.id).toBe('usr_anurag');

      // User A disconnects abruptly
      clientA.close();
      await new Promise((r) => setTimeout(r, 80));

      // Floor must be free
      expect(talkLockService.getCurrentSpeaker('145.800')).toBeNull();

      // User B can now talk
      const bRes = await new Promise<any>((r) => clientB.emit('ptt:request', { frequencyCode: '145.800' }, r));
      expect(bRes.granted).toBe(true);
    });

    it('should isolate talk locks across different virtual frequencies', async () => {
      const userA = createTestUser('usr_alpha', 'Alpha (145.800)');
      const userC = createTestUser('usr_charlie', 'Charlie (146.200)');

      const clientA = await connectClientSocket(userA.token);
      const clientC = await connectClientSocket(userC.token);

      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientC.emit('frequency:join', { frequencyCode: '146.200' }, () => r()));

      // User A acquires floor on 145.800
      const aRes = await new Promise<any>((r) => clientA.emit('ptt:request', { frequencyCode: '145.800' }, r));
      expect(aRes.granted).toBe(true);

      // User C requests floor on 146.200 -> Granted (not blocked by A's lock on 145.800)
      const cRes = await new Promise<any>((r) => clientC.emit('ptt:request', { frequencyCode: '146.200' }, r));
      expect(cRes.granted).toBe(true);
    });
  });
});
