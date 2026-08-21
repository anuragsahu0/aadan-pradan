export type UserPresenceStatus = 'online' | 'offline' | 'idle' | 'speaking';

export type UserRole = 'USER' | 'ADMIN';

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string | null;
  role: UserRole;
  status: UserAccountStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSeenAt?: Date | string | null;
}

/** Safe public profile — never includes passwordHash */
export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string | null;
  role: UserRole;
  status: UserAccountStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
}

export interface UserProfile extends AuthenticatedUser {
  presenceStatus: UserPresenceStatus;
  currentFrequencyCode?: string | null;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  status: UserPresenceStatus;
}
