/**
 * Phase 3 Auth API Tests
 *
 * Tests all auth endpoints using supertest against a real Express app
 * with mocked Prisma (no real DB required in CI).
 *
 * Strategy:
 * - Tests use vitest vi.mock to replace DB calls
 * - tokenService uses real JWT/argon2 logic
 * - Tests cover all critical auth flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => mockPrismaClient,
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

const mockUsers: Record<string, any> = {};
const mockSessions: Record<string, any> = {};

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.email) return Object.values(mockUsers).find((u: any) => u.email === where.email) ?? null;
      if (where.username) return Object.values(mockUsers).find((u: any) => u.username === where.username) ?? null;
      if (where.id) return mockUsers[where.id] ?? null;
      return null;
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      const lower = where.OR?.[0]?.email ?? '';
      return (
        Object.values(mockUsers).find((u: any) => u.email === lower || u.username === lower) ?? null
      );
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = `usr_${Date.now()}`;
      const user = { id, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSeenAt: null };
      mockUsers[id] = user;
      // Return safe user (without passwordHash)
      const { passwordHash: _ph, ...safe } = user;
      return safe;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      if (mockUsers[where.id]) {
        mockUsers[where.id] = { ...mockUsers[where.id], ...data, updatedAt: new Date() };
        const { passwordHash: _ph, ...safe } = mockUsers[where.id];
        return safe;
      }
      throw new Error('User not found');
    }),
  },
  session: {
    create: vi.fn(async ({ data }: any) => {
      const id = `sess_${Date.now()}`;
      const session = { id, ...data, createdAt: new Date(), lastUsedAt: new Date(), revokedAt: null };
      mockSessions[id] = session;
      return session;
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.refreshTokenHash) {
        return Object.values(mockSessions).find((s: any) => s.refreshTokenHash === where.refreshTokenHash) ?? null;
      }
      if (where.id) return mockSessions[where.id] ?? null;
      return null;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      if (mockSessions[where.id]) {
        mockSessions[where.id] = { ...mockSessions[where.id], ...data };
        return mockSessions[where.id];
      }
      throw new Error('Session not found');
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const s of Object.values(mockSessions) as any[]) {
        if (s.userId === where.userId && !s.revokedAt) {
          s.revokedAt = data.revokedAt;
          count++;
        }
      }
      return { count };
    }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  },
  $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  $disconnect: vi.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const app = createExpressApp();

function clearMockData() {
  Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
  Object.keys(mockSessions).forEach((k) => delete mockSessions[k]);
}

const validRegisterPayload = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  password: 'SecurePass123',
};

// ─── Registration Tests ───────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(clearMockData);

  it('should register a new user and return tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(validRegisterPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validRegisterPayload);
    const res = await request(app).post('/api/auth/register').send({
      ...validRegisterPayload,
      username: 'differentuser',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should reject duplicate username', async () => {
    await request(app).post('/api/auth/register').send(validRegisterPayload);
    const res = await request(app).post('/api/auth/register').send({
      ...validRegisterPayload,
      email: 'other@example.com',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should reject invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validRegisterPayload,
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject weak password (< 8 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validRegisterPayload,
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject malformed request body', async () => {
    const res = await request(app).post('/api/auth/register').send({ garbage: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject username with invalid characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validRegisterPayload,
      username: 'bad user!',
    });
    expect(res.status).toBe(400);
  });
});

// ─── Login Tests ──────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    clearMockData();
    await request(app).post('/api/auth/register').send(validRegisterPayload);
  });

  it('should login with valid email and return tokens', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'test@example.com',
      password: 'SecurePass123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('should login with username identifier', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'testuser',
      password: 'SecurePass123',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject wrong password with generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'test@example.com',
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // Should NOT reveal which field was wrong
    expect(res.body.error.message).toContain('Invalid credentials');
  });

  it('should reject non-existent account with same generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'ghost@nobody.com',
      password: 'AnyPassword1',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toContain('Invalid credentials');
  });

  it('should reject malformed login body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

// ─── Refresh Token Tests ──────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  beforeEach(clearMockData);

  it('should return new tokens on valid refresh', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { refreshToken } = registerRes.body.data.tokens;

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    // New refresh token must differ from old
    expect(res.body.data.tokens.refreshToken).not.toBe(refreshToken);
  });

  it('should reject an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'bogus-token' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject reused refresh token after rotation', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { refreshToken: originalToken } = registerRes.body.data.tokens;

    // Use once — rotates token
    await request(app).post('/api/auth/refresh').send({ refreshToken: originalToken });

    // Try to use the old token again
    const reuseRes = await request(app).post('/api/auth/refresh').send({ refreshToken: originalToken });
    expect(reuseRes.status).toBe(401);
  });
});

// ─── Logout Tests ─────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  beforeEach(clearMockData);

  it('should logout successfully with valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { accessToken } = registerRes.body.data.tokens;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Logged out');
  });

  it('should reject logout without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout-all', () => {
  beforeEach(clearMockData);

  it('should revoke all sessions', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { accessToken } = registerRes.body.data.tokens;

    const res = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('All sessions');
  });
});

// ─── User API Tests ───────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  beforeEach(clearMockData);

  it('should return authenticated user profile', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { accessToken } = registerRes.body.data.tokens;

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject invalid JWT token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/me', () => {
  beforeEach(clearMockData);

  it('should update display name', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validRegisterPayload);
    const { accessToken } = registerRes.body.data.tokens;

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.displayName).toBe('Updated Name');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).patch('/api/users/me').send({ displayName: 'X' });
    expect(res.status).toBe(401);
  });
});
