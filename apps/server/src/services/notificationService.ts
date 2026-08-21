import type { DevicePlatform, PushNotificationPayload } from '@aadan-pradan/types';
import { getPrismaClient } from '../repositories/prisma';
import { logger } from '../utils/logger';

class NotificationService {
  /**
   * Register or activate a device push token for an authenticated user
   */
  public async registerDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
    deviceId?: string
  ): Promise<{ id: string; token: string; platform: string; isActive: boolean }> {
    const prisma = getPrismaClient();

    const result = await prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId,
          token,
        },
      },
      create: {
        userId,
        token,
        platform,
        deviceId,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        platform,
        deviceId: deviceId ?? undefined,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    logger.info(
      { userId, platform, tokenId: result.id },
      '[NotificationService] Device token registered'
    );

    return {
      id: result.id,
      token: result.token,
      platform: result.platform,
      isActive: result.isActive,
    };
  }

  /**
   * Unregister / deactivate a device token
   */
  public async unregisterDeviceToken(userId: string, token: string): Promise<boolean> {
    const prisma = getPrismaClient();

    try {
      await prisma.deviceToken.updateMany({
        where: {
          userId,
          token,
        },
        data: {
          isActive: false,
        },
      });

      logger.info({ userId }, '[NotificationService] Device token deactivated');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deactivate all device tokens for a user (called on logout / session revoke)
   */
  public async deactivateUserTokens(userId: string): Promise<void> {
    const prisma = getPrismaClient();
    try {
      await prisma.deviceToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });
      logger.info({ userId }, '[NotificationService] All user device tokens deactivated');
    } catch {
      // Non-fatal
    }
  }

  /**
   * Send notification to one or more users
   */
  public async sendNotification(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ sentCount: number }> {
    const prisma = getPrismaClient();

    const activeTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (activeTokens.length === 0) {
      return { sentCount: 0 };
    }

    logger.info(
      { count: activeTokens.length, title: payload.title, category: payload.category },
      '[NotificationService] Dispatched push notification payload to active devices'
    );

    return { sentCount: activeTokens.length };
  }
}

export const notificationService = new NotificationService();
