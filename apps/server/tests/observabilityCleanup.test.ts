import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';
import { signAccessToken } from '../src/services/tokenService';
import { collectSystemMetrics } from '../src/services/metricsService';
import { runStaleDataCleanup } from '../src/services/cleanupService';

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};
const mockAuditLogs: any[] = [];
const mockFrequencies: Record<string, any> = {};
const mockDeviceTokens: Record<string, any> = {};

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => mockUsers[where.id] ?? null),
    count: vi.fn(async () => Object.values(mockUsers).length),
  },
  session: {
    findUnique: vi.fn(async ({ where }: any) => mockSessions[where.id] ?? null),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      Object.values(mockSessions).forEach((s: any) => {
        if (where.expiresAt && s.expiresAt < where.expiresAt.lt && s.revokedAt === null) {
          Object.assign(s, data);
          count++;
        }
      });
      return { count };
    }),
  },
  frequency: {
    count: vi.fn(async () => Object.values(mockFrequencies).length),
  },
  auditLog: {
    count: vi.fn(async () => mockAuditLogs.length),
  },
  deviceToken: {
    updateMany: vi.fn(async () => ({ count: 2 })),
  },
};

describe('Phase 11 Observability, Metrics & Cleanup Service QA', () => {
  let app: any;
  let adminToken: string;
  let normalToken: string;

  beforeEach(() => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    mockAuditLogs.length = 0;

    app = createExpressApp();

    const adminId = 'usr_admin_metrics';
    const adminSess = 'sess_admin_metrics';
    mockUsers[adminId] = {
      id: adminId,
      username: 'admin',
      displayName: 'System Admin',
      email: 'admin@aadanpradan.io',
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

    const normalId = 'usr_normal';
    const normalSess = 'sess_normal';
    mockUsers[normalId] = {
      id: normalId,
      username: 'normal',
      displayName: 'Normal User',
      email: 'normal@aadanpradan.io',
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

  it('1. Correlation ID (X-Request-ID) must be attached to responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });

  it('2. Custom client-provided X-Request-ID must be respected and returned', async () => {
    const customId = 'trace_client_123456';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-ID', customId);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('3. Metrics collector must aggregate safe operational data with zero secrets', async () => {
    const metrics = await collectSystemMetrics();
    expect(metrics.version).toBeDefined();
    expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(metrics.observability.totalRegisteredUsers).toBe(2);
    expect(metrics.memoryUsageMb.heapUsed).toBeGreaterThan(0);

    const str = JSON.stringify(metrics);
    expect(str).not.toContain('secret');
    expect(str).not.toContain('password');
  });

  it('4. GET /api/admin/metrics must enforce requireAdmin', async () => {
    const deniedRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${normalToken}`);
    expect(deniedRes.status).toBe(403);

    const grantedRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(grantedRes.status).toBe(200);
    expect(grantedRes.body.data.observability).toBeDefined();
  });

  it('5. POST /api/admin/cleanup must execute stale data pruning', async () => {
    // Seed expired session
    mockSessions['sess_expired'] = {
      id: 'sess_expired',
      userId: 'usr_normal',
      expiresAt: new Date(Date.now() - 10000),
      revokedAt: null,
    };

    const cleanupRes = await request(app)
      .post('/api/admin/cleanup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cleanupRes.status).toBe(200);
    expect(cleanupRes.body.data.expiredSessionsRevoked).toBe(1);
    expect(cleanupRes.body.data.staleTokensPruned).toBe(2);
  });
});
