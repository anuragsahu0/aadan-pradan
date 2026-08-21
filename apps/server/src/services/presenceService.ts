import { logger } from '../utils/logger';

class PresenceService {
  /** Map of userId -> Set of active socket IDs */
  private userSockets = new Map<string, Set<string>>();

  /** Map of socketId -> userId */
  private socketUsers = new Map<string, string>();

  /** Map of socketId -> tuned frequencyCode */
  private socketFrequencies = new Map<string, string>();

  /**
   * Register a new socket connection for a user.
   * Handles multi-device connections (Phone A, Phone B).
   */
  public registerSocket(
    userId: string,
    socketId: string
  ): { isFirstSocket: boolean; activeSocketsCount: number } {
    let sockets = this.userSockets.get(userId);
    const isFirstSocket = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    this.socketUsers.set(socketId, userId);

    const activeSocketsCount = sockets.size;

    logger.debug(
      { userId, socketId, isFirstSocket, activeSocketsCount },
      '[Presence] Registered socket'
    );

    if (isFirstSocket) {
      this.touchUserLastSeen(userId).catch(() => {});
    }

    return { isFirstSocket, activeSocketsCount };
  }

  /**
   * Unregister a socket on disconnection.
   * User remains ONLINE as long as they have at least 1 other socket connected.
   */
  public unregisterSocket(socketId: string): {
    isLastSocket: boolean;
    userId: string | null;
    activeSocketsCount: number;
  } {
    const userId = this.socketUsers.get(socketId) || null;
    this.socketUsers.delete(socketId);
    this.socketFrequencies.delete(socketId);

    if (!userId) {
      return { isLastSocket: false, userId: null, activeSocketsCount: 0 };
    }

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.touchUserLastSeen(userId).catch(() => {});

        logger.debug({ userId, socketId }, '[Presence] Last socket disconnected — user is now OFFLINE');
        return { isLastSocket: true, userId, activeSocketsCount: 0 };
      }

      logger.debug(
        { userId, socketId, remainingSockets: sockets.size },
        '[Presence] Socket disconnected — user remains ONLINE on other device'
      );
      return { isLastSocket: false, userId, activeSocketsCount: sockets.size };
    }

    return { isLastSocket: true, userId, activeSocketsCount: 0 };
  }

  /**
   * Associate socket with a virtual frequency
   */
  public setSocketFrequency(socketId: string, frequencyCode: string | undefined): void {
    if (frequencyCode) {
      this.socketFrequencies.set(socketId, frequencyCode);
    } else {
      this.socketFrequencies.delete(socketId);
    }
  }

  public getSocketFrequency(socketId: string): string | undefined {
    return this.socketFrequencies.get(socketId);
  }

  /**
   * Check if a user has any other active socket connected to the specified frequency.
   * Used to avoid releasing database membership if another device for the same user is still active in the frequency.
   */
  public hasOtherSocketsInFrequency(
    userId: string,
    frequencyCode: string,
    excludingSocketId: string
  ): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;

    for (const sId of sockets) {
      if (sId !== excludingSocketId && this.socketFrequencies.get(sId) === frequencyCode) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check whether a user has any active sockets
   */
  public isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  /**
   * Get active socket count for user
   */
  public getActiveSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  /**
   * Get all currently online user IDs
   */
  public getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Touch database lastSeenAt
   */
  private async touchUserLastSeen(userId: string): Promise<void> {
    try {
      const { getPrismaClient } = await import('../repositories/prisma');
      await getPrismaClient().user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Clear all in-memory tracking (useful for test resets)
   */
  public clear(): void {
    this.userSockets.clear();
    this.socketUsers.clear();
    this.socketFrequencies.clear();
  }
}

export const presenceService = new PresenceService();
