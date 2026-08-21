import crypto from 'node:crypto';
import type { UserRole, UserAccountStatus } from '@aadan-pradan/types';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';

// Pre-hashed password "password123" and "admin123" for instant dev login
const DEFAULT_USER_HASH = '$argon2id$v=19$m=65536,p=4,t=3$ZLE9zrkLSHw2ZrLtrR3Pzw$rPnwNbwgZPUdcGQuHPINiJ3v5MiFFFtaAlfzegWs8gg';

export interface MemUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserAccountStatus;
  isActive: boolean;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
}

export interface MemSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceId?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface MemFrequency {
  id: string;
  frequencyCode: string;
  name: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface MemMembership {
  id: string;
  frequencyId: string;
  userId: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: Date;
  leftAt: Date | null;
}

class MemoryStore {
  public users = new Map<string, MemUser>();
  public sessions = new Map<string, MemSession>();
  public frequencies = new Map<string, MemFrequency>();
  public memberships = new Map<string, MemMembership>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // 1. Operator 1 (Alpha)
    this.users.set('usr_anurag_01', {
      id: 'usr_anurag_01',
      username: 'anurag',
      displayName: 'Anurag Sahu',
      email: 'anurag@aadanpradan.io',
      passwordHash: DEFAULT_USER_HASH,
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      avatar: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 2. Operator 2 (Bravo)
    this.users.set('usr_bravo_02', {
      id: 'usr_bravo_02',
      username: 'bravo',
      displayName: 'Operator Bravo',
      email: 'bravo@aadanpradan.io',
      passwordHash: DEFAULT_USER_HASH,
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      avatar: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 3. Admin
    this.users.set('usr_admin_01', {
      id: 'usr_admin_01',
      username: 'admin',
      displayName: 'System Admin',
      email: 'admin@aadanpradan.io',
      passwordHash: DEFAULT_USER_HASH,
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      avatar: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 4. Default Frequency 145.800
    this.frequencies.set('145.800', {
      id: 'freq_145800',
      frequencyCode: '145.800',
      name: 'VIRTUAL CHANNEL 145.800',
      maxUsers: MAX_USERS_PER_FREQUENCY,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      lastActiveAt: new Date(),
    });
  }
}

export const memStore = new MemoryStore();
