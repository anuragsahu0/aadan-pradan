import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PttSpeakerInfo,
  PttStatePayload,
  PttGrantedPayload,
  PttReleasedPayload,
  UserSummary,
} from '@aadan-pradan/types';
import { MAX_TALK_DURATION_MS, MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import { normalizeFrequencyCode } from '@aadan-pradan/utils';
import { getActiveUsersInFrequency } from '../repositories/frequencyRepository';
import { presenceService } from './presenceService';
import { logger } from '../utils/logger';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface TalkLockEntry {
  frequencyCode: string;
  speaker: PttSpeakerInfo;
  socketId: string;
  acquiredAt: number;
  expiresAt: number;
  maxDurationMs: number;
  timeoutTimer: NodeJS.Timeout;
}

class TalkLockService {
  /** Map of frequencyCode -> TalkLockEntry */
  private locks = new Map<string, TalkLockEntry>();

  /**
   * Acquire Talk Lock (Floor) atomically for a virtual frequency
   */
  public acquireLock(
    rawFrequencyCode: string,
    user: PttSpeakerInfo,
    socketId: string,
    io: TypedServer,
    maxDurationMs: number = MAX_TALK_DURATION_MS
  ): {
    granted: boolean;
    error?: string;
    code?: 'CHANNEL_BUSY' | 'UNAUTHORIZED';
    state?: PttStatePayload;
    currentSpeaker?: PttSpeakerInfo | null;
  } {
    const frequencyCode = normalizeFrequencyCode(rawFrequencyCode);
    const existingLock = this.locks.get(frequencyCode);

    // If another user already owns the lock -> DENY
    if (existingLock && existingLock.speaker.id !== user.id) {
      logger.info(
        { frequencyCode, requester: user.id, currentSpeaker: existingLock.speaker.id },
        '[TalkLock] Floor request denied: channel busy'
      );
      return {
        granted: false,
        code: 'CHANNEL_BUSY',
        error: `Channel is currently busy. ${existingLock.speaker.displayName} is transmitting.`,
        currentSpeaker: existingLock.speaker,
      };
    }

    // If same user already owns the lock -> Idempotent grant
    if (existingLock && existingLock.speaker.id === user.id) {
      return {
        granted: true,
        state: this.getPttState(frequencyCode),
      };
    }

    const now = Date.now();
    const expiresAt = now + maxDurationMs;

    // Automatic server-side expiration timer
    const timeoutTimer = setTimeout(() => {
      logger.warn(
        { frequencyCode, speakerId: user.id, maxDurationMs },
        '[TalkLock] Maximum talk duration exceeded — automatically releasing floor'
      );
      this.releaseLock(frequencyCode, user.id, 'timeout', io);
    }, maxDurationMs);

    const lockEntry: TalkLockEntry = {
      frequencyCode,
      speaker: user,
      socketId,
      acquiredAt: now,
      expiresAt,
      maxDurationMs,
      timeoutTimer,
    };

    this.locks.set(frequencyCode, lockEntry);

    const roomKey = `frequency:${frequencyCode}`;
    const pttState: PttStatePayload = {
      frequencyCode,
      state: 'ACTIVE',
      speaker: user,
      startedAt: now,
      expiresAt,
      maxDurationMs,
    };

    logger.info(
      { frequencyCode, speakerId: user.id, username: user.username, expiresAt },
      '[TalkLock] Floor granted to speaker'
    );

    // Broadcast ptt:state to the frequency room
    io?.to(roomKey).emit('ptt:state', pttState);

    // Broadcast updated active speaker to frequency user list
    if (io) {
      this.broadcastFrequencyUsers(frequencyCode, user.id, io).catch(() => {});
    }

    return {
      granted: true,
      state: pttState,
    };
  }

  /**
   * Release Talk Lock (Floor)
   */
  public releaseLock(
    rawFrequencyCode: string,
    userId: string,
    reason: 'user_release' | 'timeout' | 'disconnect' | 'left_frequency' = 'user_release',
    io?: TypedServer
  ): boolean {
    const frequencyCode = normalizeFrequencyCode(rawFrequencyCode);
    const existingLock = this.locks.get(frequencyCode);

    if (!existingLock || existingLock.speaker.id !== userId) {
      return false;
    }

    clearTimeout(existingLock.timeoutTimer);
    this.locks.delete(frequencyCode);

    const roomKey = `frequency:${frequencyCode}`;
    const releasedPayload: PttReleasedPayload = {
      frequencyCode,
      releasedBy: userId,
      reason,
      releasedAt: Date.now(),
    };

    const freeState: PttStatePayload = {
      frequencyCode,
      state: 'FREE',
      speaker: null,
    };

    logger.info(
      { frequencyCode, speakerId: userId, reason },
      '[TalkLock] Floor released'
    );

    io?.to(roomKey).emit('ptt:released', releasedPayload);
    io?.to(roomKey).emit('ptt:state', freeState);

    // Clear active speaker in frequency user list
    if (io) {
      this.broadcastFrequencyUsers(frequencyCode, null, io).catch(() => {});
    }

    return true;
  }

  /**
   * Release all locks held by a specific user (called on disconnect / logout / channel leave)
   */
  public releaseUserLocks(
    userId: string,
    io?: TypedServer,
    reason: 'disconnect' | 'left_frequency' = 'disconnect'
  ): void {
    this.locks.forEach((lock, frequencyCode) => {
      if (lock.speaker.id === userId) {
        this.releaseLock(frequencyCode, userId, reason, io);
      }
    });
  }

  /**
   * Get current canonical PTT state for a frequency
   */
  public getPttState(rawFrequencyCode: string): PttStatePayload {
    const frequencyCode = normalizeFrequencyCode(rawFrequencyCode);
    const lock = this.locks.get(frequencyCode);

    if (lock) {
      return {
        frequencyCode,
        state: 'ACTIVE',
        speaker: lock.speaker,
        startedAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
        maxDurationMs: lock.maxDurationMs,
      };
    }

    return {
      frequencyCode,
      state: 'FREE',
      speaker: null,
    };
  }

  /**
   * Get current speaker profile for a frequency
   */
  public getCurrentSpeaker(rawFrequencyCode: string): PttSpeakerInfo | null {
    const frequencyCode = normalizeFrequencyCode(rawFrequencyCode);
    return this.locks.get(frequencyCode)?.speaker || null;
  }

  /**
   * Check if channel floor is currently free
   */
  public isChannelFree(rawFrequencyCode: string): boolean {
    const frequencyCode = normalizeFrequencyCode(rawFrequencyCode);
    return !this.locks.has(frequencyCode);
  }

  /**
   * Broadcast live active users with updated activeSpeakerId
   */
  private async broadcastFrequencyUsers(
    frequencyCode: string,
    activeSpeakerId: string | null,
    io: TypedServer
  ): Promise<void> {
    try {
      const users = await getActiveUsersInFrequency(frequencyCode);
      const mappedUsers: UserSummary[] = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        status: u.id === activeSpeakerId ? 'speaking' : presenceService.isUserOnline(u.id) ? 'online' : 'idle',
      }));

      const roomKey = `frequency:${frequencyCode}`;
      io.to(roomKey).emit('frequency:users', {
        frequencyCode,
        count: users.length,
        maxUsers: MAX_USERS_PER_FREQUENCY,
        users: mappedUsers,
        activeSpeakerId,
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Clear all active locks (useful for test resets)
   */
  public clear(): void {
    this.locks.forEach((lock) => clearTimeout(lock.timeoutTimer));
    this.locks.clear();
  }
}

export const talkLockService = new TalkLockService();
