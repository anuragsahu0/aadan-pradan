import {
  findFrequencyByCode,
  findOrCreateFrequency,
  getActiveMemberCount,
  joinFrequencyAtomic,
  leaveFrequency,
  getActiveUsersInFrequency,
  getUserRecentFrequencies as getRepoRecentFrequencies,
} from '../repositories/frequencyRepository';
import { validateFrequencyCode, normalizeFrequencyCode } from '@aadan-pradan/utils';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import { BadRequestError } from '../utils/appError';
import type {
  FrequencyStateResponse,
  JoinFrequencyResponse,
  LeaveFrequencyResponse,
  FrequencyUserSummary,
  FrequencyStatus,
} from '@aadan-pradan/types';

/**
 * Validate and normalize virtual frequency code
 */
function parseAndNormalizeCode(rawCode: string): string {
  const validation = validateFrequencyCode(rawCode);
  if (!validation.isValid) {
    throw new BadRequestError(
      validation.error || 'Invalid virtual frequency format. Expected XXX.XXX (e.g. 145.800).'
    );
  }
  return validation.normalized;
}

/**
 * Get public status & occupancy of a virtual frequency
 */
export async function getFrequencyDetails(
  rawCode: string,
  userId?: string
): Promise<FrequencyStateResponse> {
  const normalized = parseAndNormalizeCode(rawCode);
  const freq = await findFrequencyByCode(normalized);

  if (!freq) {
    return {
      frequencyCode: normalized,
      name: `VIRTUAL CHANNEL ${normalized}`,
      maxUsers: MAX_USERS_PER_FREQUENCY,
      userCount: 0,
      status: 'AVAILABLE',
      isJoined: false,
    };
  }

  const userCount = await getActiveMemberCount(freq.id);
  const status: FrequencyStatus = userCount >= freq.maxUsers ? 'FULL' : 'AVAILABLE';

  let isJoined = false;
  if (userId) {
    const { getPrismaClient } = await import('../repositories/prisma');
    const membership = await getPrismaClient().frequencyMembership.findUnique({
      where: {
        userId_frequencyId: {
          userId,
          frequencyId: freq.id,
        },
      },
    });
    isJoined = membership?.status === 'ACTIVE';
  }

  return {
    frequencyCode: normalized,
    name: freq.name,
    maxUsers: freq.maxUsers,
    userCount,
    status,
    isJoined,
  };
}

/**
 * Create or ensure virtual frequency exists
 */
export async function createOrGetFrequency(
  rawCode: string,
  name?: string
): Promise<FrequencyStateResponse> {
  const normalized = parseAndNormalizeCode(rawCode);
  const freq = await findOrCreateFrequency(normalized, name);
  const userCount = await getActiveMemberCount(freq.id);
  const status: FrequencyStatus = userCount >= freq.maxUsers ? 'FULL' : 'AVAILABLE';

  return {
    frequencyCode: normalized,
    name: freq.name,
    maxUsers: freq.maxUsers,
    userCount,
    status,
  };
}

/**
 * Atomic Join Virtual Frequency
 */
export async function joinFrequency(
  rawCode: string,
  userId: string
): Promise<JoinFrequencyResponse> {
  const normalized = parseAndNormalizeCode(rawCode);
  const result = await joinFrequencyAtomic(normalized, userId, MAX_USERS_PER_FREQUENCY);

  const status: FrequencyStatus =
    result.userCount >= result.frequency.maxUsers ? 'FULL' : 'CONNECTED';

  return {
    frequencyCode: normalized,
    joined: true,
    userCount: result.userCount,
    maxUsers: result.frequency.maxUsers,
    status,
  };
}

/**
 * Leave Virtual Frequency
 */
export async function leaveFrequencyService(
  rawCode: string,
  userId: string
): Promise<LeaveFrequencyResponse> {
  const normalized = parseAndNormalizeCode(rawCode);
  const { remainingCount } = await leaveFrequency(normalized, userId);

  return {
    frequencyCode: normalized,
    left: true,
    userCount: remainingCount,
    maxUsers: MAX_USERS_PER_FREQUENCY,
  };
}

/**
 * Get active operators in virtual frequency
 */
export async function getFrequencyUsers(rawCode: string): Promise<FrequencyUserSummary[]> {
  const normalized = parseAndNormalizeCode(rawCode);
  return getActiveUsersInFrequency(normalized);
}

/**
 * Get recent frequencies for an operator
 */
export async function getUserRecentFrequencies(userId: string): Promise<string[]> {
  return getRepoRecentFrequencies(userId);
}
