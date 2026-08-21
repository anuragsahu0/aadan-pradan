import { z } from 'zod';

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(10, 'Token must be at least 10 characters'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  systemNotifications: z.boolean().optional(),
  frequencyNotifications: z.boolean().optional(),
});
