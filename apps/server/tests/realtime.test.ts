/**
 * Phase 5 Real-Time Connection, Presence & Live Synchronization Tests
 *
 * Tests:
 * - Socket authentication (valid, missing, invalid, revoked)
 * - Multi-socket presence tracking (Phone A + Phone B online invariant)
 * - Real-time frequency synchronization across multiple client sockets
 * - Disconnect cleanup on frequency channels
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { createExpressApp } from '../src/server';
import { initializeSocketServer } from '../src/sockets/socketServer';
import { signAccessToken } from '../src/services/tokenService';
import { presenceService } from '../src/services/presenceService';

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

// ─── Test Server Setup ────────────────────────────────────────────────────────

let httpServer: HttpServer;
let port: number;
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

function connectClientSocket(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    client.on('connect', () => {
      activeClientSockets.push(client);
      resolve(client);
    });

    client.on('connect_error', (err) => {
      client.close();
      reject(err);
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Phase 5 — Real-Time Socket Connection & Presence', () => {
  beforeEach(async () => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
    Object.keys(mockMemberships).forEach((k) => delete mockMemberships[k]);
    presenceService.clear();

    const app = createExpressApp();
    httpServer = createServer(app);
    initializeSocketServer(httpServer);

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
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  describe('Socket Authentication', () => {
    it('should connect successfully with a valid access token and receive connection:ready', async () => {
      const user = createTestUser('usr_alice', 'Alice Walker');

      const readyData = await new Promise<any>((resolve, reject) => {
        const client = Client(`http://localhost:${port}`, {
          auth: { token: user.token },
          transports: ['websocket'],
          autoConnect: true,
          reconnection: false,
        });

        client.on('connection:ready', (data) => {
          activeClientSockets.push(client);
          resolve(data);
        });

        client.on('connect_error', reject);
      });

      expect(readyData.userId).toBe('usr_alice');
      expect(readyData.sessionId).toBe(user.sessionId);
    });

    it('should reject connection when auth token is missing', async () => {
      await expect(connectClientSocket()).rejects.toThrow(/AUTH_REQUIRED/);
    });

    it('should reject connection when token is invalid or tampered', async () => {
      await expect(connectClientSocket('invalid.jwt.token')).rejects.toThrow(/UNAUTHORIZED/);
    });

    it('should reject connection when user session is revoked', async () => {
      const user = createTestUser('usr_revoked', 'Revoked User');
      mockSessions[user.sessionId].revokedAt = new Date(); // Revoke session

      await expect(connectClientSocket(user.token)).rejects.toThrow(/SESSION_EXPIRED/);
    });
  });

  describe('Multi-Socket Presence Invariant', () => {
    it('should keep user ONLINE when Phone A disconnects while Phone B is still connected', async () => {
      const user = createTestUser('usr_bob', 'Bob Vance');

      // 1. Connect Phone A
      const phoneA = await connectClientSocket(user.token);
      expect(presenceService.isUserOnline('usr_bob')).toBe(true);
      expect(presenceService.getActiveSocketCount('usr_bob')).toBe(1);

      // 2. Connect Phone B
      const phoneB = await connectClientSocket(user.token);
      expect(presenceService.getActiveSocketCount('usr_bob')).toBe(2);
      expect(presenceService.isUserOnline('usr_bob')).toBe(true);

      // 3. Disconnect Phone A -> User must remain ONLINE on Phone B
      phoneA.close();
      await new Promise((r) => setTimeout(r, 80));

      expect(presenceService.isUserOnline('usr_bob')).toBe(true);
      expect(presenceService.getActiveSocketCount('usr_bob')).toBe(1);

      // 4. Disconnect Phone B -> User now transitions to OFFLINE
      phoneB.close();
      await new Promise((r) => setTimeout(r, 80));

      expect(presenceService.isUserOnline('usr_bob')).toBe(false);
      expect(presenceService.getActiveSocketCount('usr_bob')).toBe(0);
    });
  });

  describe('Real-Time Virtual Frequency Synchronization', () => {
    it('should broadcast live user list and state to all clients in same virtual frequency', async () => {
      const userA = createTestUser('usr_alex', 'Alex Miller');
      const userB = createTestUser('usr_brooke', 'Brooke Davis');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      // 1. Client A joins frequency 145.800
      await new Promise<void>((resolve) => {
        clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => resolve());
      });

      // 2. Set up listener on Client A for live updates
      const clientAReceivedUpdates: any[] = [];
      clientA.on('frequency:users', (data) => clientAReceivedUpdates.push(data));

      // 3. Client B joins frequency 145.800
      await new Promise<void>((resolve) => {
        clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => resolve());
      });

      await new Promise((r) => setTimeout(r, 100));

      // Client A must have received updated list with count: 2
      const latestUpdate = clientAReceivedUpdates[clientAReceivedUpdates.length - 1];
      expect(latestUpdate).toBeDefined();
      expect(latestUpdate.frequencyCode).toBe('145.800');
      expect(latestUpdate.count).toBe(2);
      expect(latestUpdate.users.some((u: any) => u.id === 'usr_brooke')).toBe(true);

      // 4. Client B leaves frequency 145.800
      await new Promise<void>((resolve) => {
        clientB.emit('frequency:leave', { frequencyCode: '145.800' }, () => resolve());
      });

      await new Promise((r) => setTimeout(r, 100));

      // Client A must have received update with count: 1
      const afterLeaveUpdate = clientAReceivedUpdates[clientAReceivedUpdates.length - 1];
      expect(afterLeaveUpdate.count).toBe(1);
      expect(afterLeaveUpdate.users.some((u: any) => u.id === 'usr_brooke')).toBe(false);
    });

    it('should automatically release frequency slot and broadcast update when client disconnects abruptly', async () => {
      const userA = createTestUser('usr_clark', 'Clark Kent');
      const userB = createTestUser('usr_diana', 'Diana Prince');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      // Both join 433.500
      await new Promise<void>((resolve) => {
        clientA.emit('frequency:join', { frequencyCode: '433.500' }, () => resolve());
      });
      await new Promise<void>((resolve) => {
        clientB.emit('frequency:join', { frequencyCode: '433.500' }, () => resolve());
      });

      const clientAReceivedUpdates: any[] = [];
      clientA.on('frequency:users', (data) => clientAReceivedUpdates.push(data));

      // Client B abruptly disconnects
      clientB.close();
      await new Promise((r) => setTimeout(r, 120));

      // Client A should receive broadcast that count is back to 1
      expect(clientAReceivedUpdates.length).toBeGreaterThan(0);
      const latest = clientAReceivedUpdates[clientAReceivedUpdates.length - 1];
      expect(latest.count).toBe(1);
      expect(latest.users.some((u: any) => u.id === 'usr_diana')).toBe(false);
    });
  });
});
