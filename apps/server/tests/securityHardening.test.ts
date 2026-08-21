import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createExpressApp } from '../src/server';
import { signAccessToken } from '../src/services/tokenService';
import { env } from '../src/config/env';

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockFrequencies: Record<string, any> = {};
const mockAuditLogs: any[] = [];

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => mockUsers[where.id] ?? null),
    findMany: vi.fn(async ({ where, skip, take }: any) => {
      let list = Object.values(mockUsers);
      if (where?.role) list = list.filter((u: any) => u.role === where.role);
      if (where?.status) list = list.filter((u: any) => u.status === where.status);
      return list.slice(skip || 0, (skip || 0) + (take || 20));
    }),
    count: vi.fn(async ({ where }: any = {}) => {
      let list = Object.values(mockUsers);
      if (where?.role) list = list.filter((u: any) => u.role === where.role);
      if (where?.status) list = list.filter((u: any) => u.status === where.status);
      if (where?.isActive !== undefined) list = list.filter((u: any) => u.isActive === where.isActive);
      return list.length;
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
    findUnique: vi.fn(async ({ where }: any) => mockSessions[where.id] ?? null),
    findMany: vi.fn(async () => Object.values(mockSessions)),
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
    findUnique: vi.fn(async ({ where }: any) => mockFrequencies[where.frequencyCode] ?? null),
    findMany: vi.fn(async () => Object.values(mockFrequencies).map((f) => ({ ...f, memberships: [] }))),
    count: vi.fn(async ({ where }: any = {}) => {
      let list = Object.values(mockFrequencies);
      if (where?.isActive !== undefined) list = list.filter((f: any) => f.isActive === where.isActive);
      return list.length;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      if (mockFrequencies[where.frequencyCode]) {
        Object.assign(mockFrequencies[where.frequencyCode], data);
        return mockFrequencies[where.frequencyCode];
      }
      return null;
    }),
  },
  deviceToken: {
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  auditLog: {
    create: vi.fn(async ({ data }: any) => {
      const item = { id: `aud_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
      mockAuditLogs.push(item);
      return item;
    }),
    findMany: vi.fn(async ({ skip, take }: any) => {
      return mockAuditLogs.slice(skip || 0, (skip || 0) + (take || 20));
    }),
    count: vi.fn(async () => mockAuditLogs.length),
  },
};

describe('Phase 9 Security Test Matrix (Defense-in-Depth)', () => {
  let app: any;
  let adminToken: string;
  let normalToken: string;

  beforeEach(() => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
    mockAuditLogs.length = 0;

    app = createExpressApp();

    const adminId = 'usr_admin_root';
    const adminSess = 'sess_admin_root';
    mockUsers[adminId] = {
      id: adminId,
      username: 'adminroot',
      displayName: 'Root Administrator',
      email: 'root@aadanpradan.io',
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date(),
    };
    mockSessions[adminSess] = {
      id: adminSess,
      userId: adminId,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };
    adminToken = signAccessToken(adminId, adminSess);

    const normalId = 'usr_regular_operator';
    const normalSess = 'sess_normal_operator';
    mockUsers[normalId] = {
      id: normalId,
      username: 'regularoperator',
      displayName: 'Regular Operator',
      email: 'operator@aadanpradan.io',
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date(),
    };
    mockSessions[normalSess] = {
      id: normalSess,
      userId: normalId,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };
    normalToken = signAccessToken(normalId, normalSess);
  });

  it('1. Unauthenticated API request must fail with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Normal user accessing admin endpoint must fail with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${normalToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Administrator privileges required');
  });

  it('3. Suspended user accessing API must fail with 401 or 403', async () => {
    mockUsers['usr_regular_operator'].status = 'SUSPENDED';
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${normalToken}`);
    expect([401, 403]).toContain(res.status);
  });

  it('4. Expired or forged access token must fail safely with 401', async () => {
    const forgedToken = jwt.sign({ userId: 'usr_regular_operator', sessionId: 'sess_normal_operator' }, 'wrong_secret', { expiresIn: '15m' });
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(res.status).toBe(401);
  });

  it('5. Admin self-suspension must be blocked with 400 Bad Request', async () => {
    const res = await request(app)
      .patch('/api/admin/users/usr_admin_root/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('cannot suspend their own account');
  });

  it('6. Malformed or invalid admin request payloads must fail with 400', async () => {
    const res = await request(app)
      .patch('/api/admin/users/usr_regular_operator/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
  });

  it('7. Health and Readiness probes must never expose private credentials or secrets', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(JSON.stringify(healthRes.body)).not.toContain('secret');
    expect(JSON.stringify(healthRes.body)).not.toContain('password');

    const readyRes = await request(app).get('/api/health/ready');
    expect(readyRes.status).toBe(200);
    expect(JSON.stringify(readyRes.body)).not.toContain('secret');
  });
});
