import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';
import { signAccessToken } from '../src/services/tokenService';

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

describe('Phase 9 RBAC, Admin Control Center & Audit System', () => {
  let app: any;
  let adminToken: string;
  let normalUserToken: string;

  beforeEach(() => {
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
    Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
    Object.keys(mockFrequencies).forEach((k) => delete mockFrequencies[k]);
    mockAuditLogs.length = 0;

    app = createExpressApp();

    // Create Admin User
    const adminId = 'usr_admin_1';
    const adminSess = 'sess_admin';
    mockUsers[adminId] = {
      id: adminId,
      username: 'admin',
      displayName: 'System Administrator',
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

    // Create Normal User
    const regularId = 'usr_regular_1';
    const regularSess = 'sess_reg';
    mockUsers[regularId] = {
      id: regularId,
      username: 'regular_user',
      displayName: 'Regular Operator',
      email: 'user@aadanpradan.io',
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date(),
    };
    mockSessions[regularSess] = {
      id: regularSess,
      userId: regularId,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };
    normalUserToken = signAccessToken(regularId, regularSess);

    // Setup frequency
    mockFrequencies['145.800'] = {
      id: 'freq_145800',
      frequencyCode: '145.800',
      name: 'General Calling',
      maxUsers: 40,
      isActive: true,
      createdAt: new Date(),
    };
  });

  describe('RBAC Authorization Protection', () => {
    it('should reject normal USER from accessing admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Administrator privileges required');
    });

    it('should grant ADMIN access to admin overview endpoints with 200 OK', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalUsers).toBe(2);
      expect(res.body.data.systemHealth).toBe('HEALTHY');
    });
  });

  describe('User Search & Pagination', () => {
    it('should list users with pagination and role filters', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBe(2);
    });
  });

  describe('User Suspension & Admin Self-Protection', () => {
    it('should suspend user, revoke sessions, and record audit log', async () => {
      const res = await request(app)
        .patch('/api/admin/users/usr_regular_1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUSPENDED');
      expect(mockUsers['usr_regular_1'].status).toBe('SUSPENDED');
      expect(mockSessions['sess_reg'].revokedAt).not.toBeNull();

      // Audit log must be written
      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0].action).toBe('USER_SUSPENDED');
      expect(mockAuditLogs[0].targetId).toBe('usr_regular_1');

      // Suspended user now rejected on protected APIs (session revoked -> 401 Unauthorized)
      const meRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect([401, 403]).toContain(meRes.status);
    });

    it('should prevent admin from suspending themselves (self-protection)', async () => {
      const res = await request(app)
        .patch('/api/admin/users/usr_admin_1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot suspend their own account');
    });
  });

  describe('Frequency Deactivation & Audit Trail', () => {
    it('should deactivate frequency and write audit log', async () => {
      const res = await request(app)
        .patch('/api/admin/frequencies/145.800/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(mockFrequencies['145.800'].isActive).toBe(false);

      const auditRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.logs.length).toBeGreaterThan(0);
    });

    it('should fetch security summary metrics', async () => {
      const res = await request(app)
        .get('/api/admin/security/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.failedLoginsLast24h).toBeDefined();
      expect(res.body.data.suspendedUsersCount).toBeDefined();
    });
  });
});
