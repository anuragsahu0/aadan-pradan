import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/server.js';

describe('GET /api/config', () => {
  const app = createExpressApp();

  it('should return 200 OK with public configuration including 40 max users', async () => {
    const res = await request(app).get('/api/config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.maxUsersPerFrequency).toBe(40);
    expect(res.body.data.defaultFrequency).toBe('145.800');
    expect(res.body.data.features.voiceEnabled).toBe(false); // Strictly false in Phase 1
  });
});
