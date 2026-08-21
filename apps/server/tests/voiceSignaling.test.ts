/**
 * Phase 6 WebRTC Voice Signaling & Frequency Isolation Tests
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

// ─── Setup ────────────────────────────────────────────────────────────────────

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

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Phase 6 — WebRTC Voice Signaling & Frequency Isolation', () => {
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

  describe('Voice Session Authorization', () => {
    it('should reject voice:join if the user is not an active member of the frequency', async () => {
      const userA = createTestUser('usr_alpha', 'Alpha');
      const clientA = await connectClientSocket(userA.token);

      const joinRes = await new Promise<any>((resolve) => {
        clientA.emit('voice:join', { frequencyCode: '145.800' }, resolve);
      });

      expect(joinRes.success).toBe(false);
      expect(joinRes.error).toContain('You must join this virtual frequency');
    });

    it('should grant voice session configuration when user is an active member', async () => {
      const userA = createTestUser('usr_alpha', 'Alpha');
      const clientA = await connectClientSocket(userA.token);

      // Join frequency first
      await new Promise<void>((resolve) => {
        clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => resolve());
      });

      // Now join voice session
      const joinRes = await new Promise<any>((resolve) => {
        clientA.emit('voice:join', { frequencyCode: '145.800' }, resolve);
      });

      expect(joinRes.success).toBe(true);
      expect(joinRes.config).toBeDefined();
      expect(joinRes.config.frequencyCode).toBe('145.800');
      expect(joinRes.config.iceServers.length).toBeGreaterThan(0);
      expect(joinRes.config.maxBitrate).toBe(32000);
    });
  });

  describe('Frequency Isolation & Signaling Relay', () => {
    it('should relay offer, answer, and ICE candidate only to peers on the SAME frequency, isolating other frequencies', async () => {
      const userA = createTestUser('usr_alex', 'Alex (145.800)');
      const userB = createTestUser('usr_brooke', 'Brooke (145.800)');
      const userC = createTestUser('usr_charlie', 'Charlie (146.200)');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);
      const clientC = await connectClientSocket(userC.token);

      // 1. Join respective frequencies
      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientC.emit('frequency:join', { frequencyCode: '146.200' }, () => r()));

      // 2. Join voice sessions
      await new Promise<void>((r) => clientA.emit('voice:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('voice:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientC.emit('voice:join', { frequencyCode: '146.200' }, () => r()));

      // 3. Listeners for offers
      const bReceivedOffers: any[] = [];
      const cReceivedOffers: any[] = [];
      clientB.on('voice:offer', (data) => bReceivedOffers.push(data));
      clientC.on('voice:offer', (data) => cReceivedOffers.push(data));

      // 4. Client A emits voice:offer on 145.800
      clientA.emit('voice:offer', {
        frequencyCode: '145.800',
        targetPeerId: 'usr_brooke',
        sdp: 'v=0\r\no=Alex 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 54312 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n',
      });

      await new Promise((r) => setTimeout(r, 80));

      // Client B on 145.800 MUST receive the offer
      expect(bReceivedOffers.length).toBe(1);
      expect(bReceivedOffers[0].senderPeerId).toBe('usr_alex');
      expect(bReceivedOffers[0].sdp).toContain('opus/48000/2');

      // Client C on 146.200 MUST NOT receive anything (Frequency Isolation)
      expect(cReceivedOffers.length).toBe(0);

      // 5. Client B emits voice:answer on 145.800 back to Client A
      const aReceivedAnswers: any[] = [];
      clientA.on('voice:answer', (data) => aReceivedAnswers.push(data));

      clientB.emit('voice:answer', {
        frequencyCode: '145.800',
        targetPeerId: 'usr_alex',
        sdp: 'v=0\r\no=Brooke 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 54314 UDP/TLS/RTP/SAVPF 111\r\n',
      });

      await new Promise((r) => setTimeout(r, 80));
      expect(aReceivedAnswers.length).toBe(1);
      expect(aReceivedAnswers[0].senderPeerId).toBe('usr_brooke');

      // 6. Client A emits voice:ice-candidate
      const bReceivedIce: any[] = [];
      clientB.on('voice:ice-candidate', (data) => bReceivedIce.push(data));

      clientA.emit('voice:ice-candidate', {
        frequencyCode: '145.800',
        targetPeerId: 'usr_brooke',
        candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host', sdpMid: '0', sdpMLineIndex: 0 },
      });

      await new Promise((r) => setTimeout(r, 80));
      expect(bReceivedIce.length).toBe(1);
      expect(bReceivedIce[0].senderPeerId).toBe('usr_alex');
      expect(bReceivedIce[0].candidate.candidate).toContain('192.168.1.100');
    });

    it('should notify peers when a participant leaves or disconnects from voice session', async () => {
      const userA = createTestUser('usr_alex', 'Alex');
      const userB = createTestUser('usr_brooke', 'Brooke');

      const clientA = await connectClientSocket(userA.token);
      const clientB = await connectClientSocket(userB.token);

      await new Promise<void>((r) => clientA.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('frequency:join', { frequencyCode: '145.800' }, () => r()));

      await new Promise<void>((r) => clientA.emit('voice:join', { frequencyCode: '145.800' }, () => r()));
      await new Promise<void>((r) => clientB.emit('voice:join', { frequencyCode: '145.800' }, () => r()));

      const leftEvents: any[] = [];
      clientA.on('voice:peer-left', (data) => leftEvents.push(data));

      // Client B leaves voice
      clientB.emit('voice:leave', { frequencyCode: '145.800' });
      await new Promise((r) => setTimeout(r, 80));

      expect(leftEvents.length).toBe(1);
      expect(leftEvents[0].peerId).toBe('usr_brooke');
    });
  });
});
