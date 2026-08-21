import type { UserRole, UserAccountStatus } from './user';

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  onlineUsers: number;
  activeFrequencies: number;
  activeSpeakersCount: number;
  serverUptimeSeconds: number;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  databaseStatus: 'connected' | 'disconnected';
}

export interface AdminUserListItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserAccountStatus;
  createdAt: string;
  lastSeenAt?: string | null;
  isOnline: boolean;
  currentFrequencyCode?: string | null;
}

export interface AdminFrequencyListItem {
  id: string;
  frequencyCode: string;
  name?: string | null;
  maxUsers: number;
  memberCount: number;
  activeSpeaker?: { id: string; displayName: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AdminSecuritySummary {
  failedLoginsLast24h: number;
  suspendedUsersCount: number;
  rateLimitEventsCount: number;
  unauthorizedPttAttempts: number;
}
