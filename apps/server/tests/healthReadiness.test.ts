import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server';

vi.mock('../src/repositories/prisma', () => ({
  getPrismaClient: () => ({}),
  checkDatabaseConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

describe('Phase 8 Server Health and Readiness Probes', () => {
  const app = createExpressApp();

  it('GET /api/health should return liveness status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBeDefined();
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/health/ready should return readiness status ready when database is connected', async () => {
    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ready).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.database).toBe('connected');
  });
});
