export type DevicePlatform = 'ios' | 'android' | 'web';

export type NotificationPermissionStatus =
  | 'not_determined'
  | 'granted'
  | 'denied'
  | 'blocked';

export type NotificationCategory =
  | 'SYSTEM'
  | 'FREQUENCY_EVENT'
  | 'ACCOUNT'
  | 'CONNECTION';

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
}

export interface NotificationPreferences {
  systemNotifications: boolean;
  frequencyNotifications: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  category?: NotificationCategory;
  data?: Record<string, string>;
}
