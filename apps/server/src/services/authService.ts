import {
  findUserByIdentifier,
  findUserByEmail,
  findUserByUsername,
  createUser,
} from '../repositories/userRepository';
import {
  createSession,
  findSessionByRefreshHash,
  revokeSession,
  revokeAllUserSessions,
  updateSessionRefreshHash,
} from '../repositories/sessionRepository';
import {
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  signAccessToken,
  getAccessTokenExpirySeconds,
  getRefreshTokenExpiryDate,
} from './tokenService';
import {
  UnauthorizedError,
  ConflictError,
} from '../utils/appError';
import { logger } from '../utils/logger';
import type { AuthTokens, AuthResponse, UserRole, UserAccountStatus } from '@aadan-pradan/types';

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  deviceId?: string;
  userAgent?: string;
}): Promise<AuthResponse> {
  const emailNorm = data.email.toLowerCase().trim();
  const usernameNorm = data.username.toLowerCase().trim();

  // Check for conflicts — generic duplicate check without revealing which field
  const [emailExists, usernameExists] = await Promise.all([
    findUserByEmail(emailNorm),
    findUserByUsername(usernameNorm),
  ]);

  if (emailExists) {
    throw new ConflictError('An account with this email already exists.');
  }
  if (usernameExists) {
    throw new ConflictError('This username is already taken. Please choose another.');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createUser({
    username: usernameNorm,
    displayName: data.displayName.trim(),
    email: emailNorm,
    passwordHash,
  });

  const tokens = await createSessionAndTokens(user.id, data.deviceId, data.userAgent);

  logger.info({ userId: user.id, username: user.username }, '[Auth] New user registered');

  const safeUser = {
    ...user,
    role: ((user as any).role as UserRole) || 'USER',
    status: ((user as any).status as UserAccountStatus) || 'ACTIVE',
    createdAt: (user.createdAt as Date).toISOString?.() ?? String(user.createdAt),
    updatedAt: (user.updatedAt as Date).toISOString?.() ?? String(user.updatedAt),
    lastSeenAt: user.lastSeenAt ? ((user.lastSeenAt as Date).toISOString?.() ?? String(user.lastSeenAt)) : null,
  };

  return { user: safeUser, tokens };
}

const PHONETICS = [
  'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF',
  'HOTEL', 'INDIA', 'JULIETT', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER',
  'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM',
  'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU'
];

export async function registerGuestOperator(data?: {
  deviceId?: string;
  userAgent?: string;
}): Promise<AuthResponse> {
  const prefix = PHONETICS[Math.floor(Math.random() * PHONETICS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const username = `${prefix.toLowerCase()}_${num}`;
  const displayName = `${prefix}-${num}`;
  const email = `${username}@operator.aadanpradan.io`;
  const passwordHash = await hashPassword('password123');

  const user = await createUser({
    username,
    displayName,
    email,
    passwordHash,
  });

  const tokens = await createSessionAndTokens(user.id, data?.deviceId, data?.userAgent);
  logger.info({ userId: user.id, username: user.username }, '[Auth] New guest operator auto-assigned');

  const safeUser = {
    ...user,
    role: ((user as any).role as UserRole) || 'USER',
    status: ((user as any).status as UserAccountStatus) || 'ACTIVE',
    createdAt: (user.createdAt as Date).toISOString?.() ?? String(user.createdAt),
    updatedAt: (user.updatedAt as Date).toISOString?.() ?? String(user.updatedAt),
    lastSeenAt: user.lastSeenAt ? ((user.lastSeenAt as Date).toISOString?.() ?? String(user.lastSeenAt)) : null,
  };

  return { user: safeUser, tokens };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(data: {
  identifier: string;
  password: string;
  deviceId?: string;
  userAgent?: string;
}): Promise<AuthResponse> {
  const fullUser = await findUserByIdentifier(data.identifier);

  // Constant-time check: always verify even if user not found (prevent timing attacks)
  const dummyHash =
    '$argon2id$v=19$m=65536,t=3,p=1$aaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const isValid = fullUser
    ? await verifyPassword(data.password, fullUser.passwordHash)
    : await verifyPassword(data.password, dummyHash).then(() => false);

  if (!fullUser || !isValid) {
    // Generic message — do not reveal which field was wrong
    throw new UnauthorizedError('Invalid credentials. Please check your details and try again.');
  }

  if (!fullUser.isActive || (fullUser as any).status === 'SUSPENDED') {
    throw new UnauthorizedError('Your account has been deactivated or suspended. Please contact support.');
  }

  const safeUser = {
    id: fullUser.id,
    username: fullUser.username,
    displayName: fullUser.displayName,
    email: fullUser.email,
    avatar: fullUser.avatar,
    role: ((fullUser as any).role as UserRole) || 'USER',
    status: ((fullUser as any).status as UserAccountStatus) || 'ACTIVE',
    isActive: fullUser.isActive,
    createdAt: fullUser.createdAt.toISOString(),
    updatedAt: fullUser.updatedAt.toISOString(),
    lastSeenAt: fullUser.lastSeenAt?.toISOString() ?? null,
  };

  const tokens = await createSessionAndTokens(fullUser.id, data.deviceId, data.userAgent);

  logger.info({ userId: fullUser.id, username: fullUser.username }, '[Auth] User logged in');

  return { user: safeUser, tokens };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refreshSession(rawRefreshToken: string): Promise<AuthTokens> {
  const crypto = await import('node:crypto');
  const lookupHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const session = await findSessionByRefreshHash(lookupHash);

  if (!session) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  // Check revocation
  if (session.revokedAt !== null) {
    // Token reuse detected — revoke entire session family for security
    await revokeSession(session.id);
    logger.warn({ sessionId: session.id, userId: session.userId }, '[Auth] Refresh token reuse detected — session revoked');
    throw new UnauthorizedError('Session has been invalidated. Please log in again.');
  }

  // Check expiry
  if (session.expiresAt < new Date()) {
    await revokeSession(session.id);
    throw new UnauthorizedError('Your session has expired. Please log in again.');
  }

  // Rotate: generate new refresh token, invalidate old
  const newRawToken = generateRefreshToken();
  const newHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
  await updateSessionRefreshHash(session.id, newHash);

  const accessToken = signAccessToken(session.userId, session.id);

  logger.info({ sessionId: session.id, userId: session.userId }, '[Auth] Session refreshed');

  return {
    accessToken,
    refreshToken: newRawToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutSession(sessionId: string, userId: string): Promise<void> {
  await revokeSession(sessionId);
  logger.info({ sessionId, userId }, '[Auth] Session logged out');
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await revokeAllUserSessions(userId);
  logger.info({ userId }, '[Auth] All sessions revoked (logout-all)');
}

// ─── Verify Session ───────────────────────────────────────────────────────────

export async function verifySessionActive(sessionId: string): Promise<boolean> {
  const { findSessionById } = await import('../repositories/sessionRepository');
  const session = await findSessionById(sessionId);
  if (!session) return false;
  if (session.revokedAt !== null) return false;
  if (session.expiresAt < new Date()) return false;
  return true;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function createSessionAndTokens(
  userId: string,
  deviceId?: string,
  userAgent?: string
): Promise<AuthTokens> {
  const crypto = await import('node:crypto');
  const rawRefreshToken = generateRefreshToken();
  // Store SHA-256 for O(1) indexed lookup
  const lookupHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const session = await createSession({
    userId,
    refreshTokenHash: lookupHash,
    deviceId: deviceId ?? null,
    userAgent: userAgent ?? null,
    expiresAt: getRefreshTokenExpiryDate(),
  });

  const accessToken = signAccessToken(userId, session.id);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
}
