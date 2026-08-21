import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server.js';

describe('GET /api/health', () => {
  const app = createExpressApp();

  it('should return 200 OK with proper service metadata', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.service).toBe('aadan-pradan-server');
    expect(res.body.data.status).toMatch(/ok|degraded/);
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.body.meta.service).toBe('aadan-pradan-server');
  });
});
