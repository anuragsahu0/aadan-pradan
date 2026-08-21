import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../src/store/authStore';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserAccountStatus,
  deactivateVirtualFrequency,
  fetchAdminAuditLogs,
  fetchAdminSecuritySummary,
} from '../src/api/adminApi';
import { apiClient } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Phase 9 Mobile Admin RBAC & API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('should store and identify user with ADMIN role', () => {
    useAuthStore.getState().setUser({
      id: 'usr_admin',
      username: 'chief_admin',
      displayName: 'Chief Administrator',
      email: 'admin@aadanpradan.io',
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: null,
    });

    const currentUser = useAuthStore.getState().user;
    expect(currentUser?.role).toBe('ADMIN');
    expect(currentUser?.status).toBe('ACTIVE');
  });

  it('should call GET /admin/overview to fetch cluster statistics', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: {
          totalUsers: 15,
          activeUsers: 14,
          suspendedUsers: 1,
          onlineUsers: 8,
          activeFrequencies: 3,
          activeSpeakersCount: 1,
          serverUptimeSeconds: 1200,
          systemHealth: 'HEALTHY',
          databaseStatus: 'connected',
        },
      },
    });

    const data = await fetchAdminOverview();
    expect(apiClient.get).toHaveBeenCalledWith('/admin/overview');
    expect(data.totalUsers).toBe(15);
    expect(data.systemHealth).toBe('HEALTHY');
  });

  it('should call GET /admin/users with search query and pagination', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: {
          users: [{ id: 'usr_1', username: 'operator1', role: 'USER', status: 'ACTIVE' }],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });

    const data = await fetchAdminUsers({ q: 'operator1' });
    expect(apiClient.get).toHaveBeenCalledWith('/admin/users', { params: { q: 'operator1' } });
    expect(data.users.length).toBe(1);
  });

  it('should call PATCH /admin/users/:userId/status to suspend user', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      data: {
        data: { id: 'usr_1', username: 'operator1', status: 'SUSPENDED' },
      },
    });

    const result = await updateUserAccountStatus('usr_1', 'SUSPENDED');
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/usr_1/status', { status: 'SUSPENDED' });
    expect(result.status).toBe('SUSPENDED');
  });

  it('should call PATCH /admin/frequencies/:code/status to deactivate frequency', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      data: {
        data: { success: true, frequencyCode: '145.800', isActive: false },
      },
    });

    const result = await deactivateVirtualFrequency('145.800');
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/frequencies/145.800/status');
    expect(result).toBe(true);
  });

  it('should call GET /admin/audit-logs and GET /admin/security/summary', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: {
          logs: [{ id: 'aud_1', action: 'USER_SUSPENDED', createdAt: new Date().toISOString() }],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: {
          failedLoginsLast24h: 3,
          suspendedUsersCount: 1,
          rateLimitEventsCount: 0,
          unauthorizedPttAttempts: 0,
        },
      },
    });

    const auditData = await fetchAdminAuditLogs();
    const secData = await fetchAdminSecuritySummary();

    expect(auditData.logs.length).toBe(1);
    expect(secData.failedLoginsLast24h).toBe(3);
  });
});
