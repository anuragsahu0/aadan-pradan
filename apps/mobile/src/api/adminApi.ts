import { apiClient } from './client';
import type {
  AdminOverviewStats,
  AdminUserListItem,
  AdminFrequencyListItem,
  AuditLogEntry,
  AdminSecuritySummary,
  UserAccountStatus,
} from '@aadan-pradan/types';

export async function fetchAdminOverview(): Promise<AdminOverviewStats> {
  const res = await apiClient.get('/admin/overview');
  return res.data.data;
}

export async function fetchAdminUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUserListItem[]; total: number; page: number; limit: number }> {
  const res = await apiClient.get('/admin/users', { params });
  return res.data.data;
}

export async function updateUserAccountStatus(
  userId: string,
  status: UserAccountStatus
): Promise<{ id: string; username: string; status: UserAccountStatus }> {
  const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
  return res.data.data;
}

export async function fetchAdminFrequencies(
  page: number = 1,
  limit: number = 20
): Promise<{ frequencies: AdminFrequencyListItem[]; total: number; page: number; limit: number }> {
  const res = await apiClient.get('/admin/frequencies', { params: { page, limit } });
  return res.data.data;
}

export async function deactivateVirtualFrequency(frequencyCode: string): Promise<boolean> {
  const res = await apiClient.patch(`/admin/frequencies/${encodeURIComponent(frequencyCode)}/status`);
  return res.data.data.isActive === false;
}

export async function fetchAdminAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
}): Promise<{ logs: AuditLogEntry[]; total: number; page: number; limit: number }> {
  const res = await apiClient.get('/admin/audit-logs', { params });
  return res.data.data;
}

export async function fetchAdminSecuritySummary(): Promise<AdminSecuritySummary> {
  const res = await apiClient.get('/admin/security/summary');
  return res.data.data;
}
