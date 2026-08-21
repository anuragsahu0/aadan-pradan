import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';
import { signAccessToken } from '../src/services/tokenService';

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockTokens: Record<string, any> = {};

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => mockUsers[where.id] ?? null),
  },
  session: {
    findUnique: vi.fn(async ({ where }: any) => mockSessions[where.id] ?? null),
  },
  deviceToken: {
    upsert: vi.fn(async ({ where, create, update }: any) => {
      const key = `${where.userId_token.userId}_${where.userId_token.token}`;
      if (mockTokens[key]) {
        Object.assign(mockTokens[key], update);
        return mockTokens[key];
      }
      const item = { id: `tok_${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
      mockTokens[key] = item;
      return item;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      Object.values(mockTokens).forEach((t: any) => {
        if (t.userId === where.userId && (where.token ? t.token === where.token : true)) {
          Object.assign(t, data);
          count++;
        }
      });
      return { count };
    }),
    findMany: vi.fn(async ({ where }: any) => {
      return Object.values(mockTokens).filter(
        (t: any) => where.userId?.in?.includes(t.userId) && (where.isActive ? t.isActive === where.isActive : true)
      );
    }),
  },
};

describe('Phase 8 Backend Notification Endpoints', () => {
  let app: any;
  let testUserToken: string;

  beforeEach(() => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockTokens).forEach((k) => delete mockTokens[k]);

    app = createExpressApp();

    const userId = 'usr_operator_1';
    const sessionId = 'sess_123';
    mockUsers[userId] = {
      id: userId,
      username: 'operator1',
      displayName: 'Operator 1',
      email: 'op1@aadanpradan.io',
      isActive: true,
    };
    mockSessions[sessionId] = {
      id: sessionId,
      userId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };
    testUserToken = signAccessToken(userId, sessionId);
  });

  it('should register a device token for authenticated user', async () => {
    const res = await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'ios',
        deviceId: 'iPhone15,2',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
    expect(res.body.data.platform).toBe('ios');
    expect(res.body.data.isActive).toBe(true);
  });

  it('should reject device token registration when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/notifications/devices')
      .send({
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid platform or too-short token format', async () => {
    const res = await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        token: 'short',
        platform: 'blackberry',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should deactivate a device token upon DELETE request', async () => {
    // Register first
    await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        token: 'ExponentPushToken[deactivateme1234567890]',
        platform: 'android',
      });

    const res = await request(app)
      .delete('/api/notifications/devices/ExponentPushToken[deactivateme1234567890]')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch and update notification preferences', async () => {
    const getRes = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.systemNotifications).toBe(true);

    const patchRes = await request(app)
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        systemNotifications: false,
        frequencyNotifications: true,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.systemNotifications).toBe(false);
    expect(patchRes.body.data.frequencyNotifications).toBe(true);
  });
});
