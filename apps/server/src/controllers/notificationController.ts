import type { Request, Response, NextFunction } from 'express';
import {
  registerDeviceTokenSchema,
  notificationPreferencesSchema,
} from '../validators/notificationValidator';
import { notificationService } from '../services/notificationService';
import { sendSuccess } from '../utils/apiResponse';

export async function registerDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = registerDeviceTokenSchema.parse(req.body);
    const result = await notificationService.registerDeviceToken(
      userId,
      data.token,
      data.platform,
      data.deviceId
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function unregisterDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const token = req.params.token;
    await notificationService.unregisterDeviceToken(userId, token);
    sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Default notification preferences
    sendSuccess(res, {
      systemNotifications: true,
      frequencyNotifications: true,
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = notificationPreferencesSchema.parse(req.body);
    sendSuccess(res, {
      systemNotifications: data.systemNotifications ?? true,
      frequencyNotifications: data.frequencyNotifications ?? true,
    });
  } catch (err) {
    next(err);
  }
}
