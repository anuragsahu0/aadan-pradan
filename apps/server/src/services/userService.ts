import { findUserById, updateUser, findUserByUsername } from '../repositories/userRepository';
import { ConflictError, NotFoundError } from '../utils/appError';
import type { AuthenticatedUser, UpdateProfileRequest, UserRole, UserAccountStatus } from '@aadan-pradan/types';

function toAuthenticatedUser(raw: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string | null;
  role?: string;
  status?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
}): AuthenticatedUser {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.displayName,
    email: raw.email,
    avatar: raw.avatar,
    role: (raw.role as UserRole) || 'USER',
    status: (raw.status as UserAccountStatus) || 'ACTIVE',
    isActive: raw.isActive,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    lastSeenAt: raw.lastSeenAt?.toISOString() ?? null,
  };
}

export async function getMyProfile(userId: string): Promise<AuthenticatedUser> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError('User not found.');
  return toAuthenticatedUser(user);
}

export async function updateMyProfile(
  userId: string,
  data: UpdateProfileRequest
): Promise<AuthenticatedUser> {
  // Validate username uniqueness if changing
  if (data.username) {
    const norm = data.username.toLowerCase().trim();
    const existing = await findUserByUsername(norm);
    if (existing && existing.id !== userId) {
      throw new ConflictError('This username is already taken. Please choose another.');
    }
    data.username = norm;
  }

  const updated = await updateUser(userId, {
    ...(data.displayName ? { displayName: data.displayName.trim() } : {}),
    ...(data.username ? { username: data.username } : {}),
    ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
  });

  return toAuthenticatedUser(updated);
}
