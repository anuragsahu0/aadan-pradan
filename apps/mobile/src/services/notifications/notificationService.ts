import { Platform } from 'react-native';
import type { NotificationPermissionStatus, DevicePlatform } from '@aadan-pradan/types';
import { apiClient } from '../../api/client';
import { normalizeFrequencyCode, isValidFrequencyCode } from '@aadan-pradan/utils';

class NotificationService {
  private currentStatus: NotificationPermissionStatus = 'not_determined';
  private registeredToken: string | null = null;

  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof Notification !== 'undefined') {
        const perm = Notification.permission;
        this.currentStatus = perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'not_determined';
        return this.currentStatus;
      }
      return 'not_determined';
    }

    return this.currentStatus;
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof Notification !== 'undefined') {
        try {
          const perm = await Notification.requestPermission();
          this.currentStatus = perm === 'granted' ? 'granted' : 'denied';
          return this.currentStatus === 'granted';
        } catch {
          this.currentStatus = 'denied';
          return false;
        }
      }
      return false;
    }

    this.currentStatus = 'granted';
    return true;
  }

  public async registerDeviceToken(token: string): Promise<boolean> {
    try {
      const platform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      await apiClient.post('/notifications/devices', { token, platform });
      this.registeredToken = token;
      return true;
    } catch {
      return false;
    }
  }

  public async unregisterDeviceToken(): Promise<boolean> {
    if (!this.registeredToken) return true;

    try {
      await apiClient.delete(`/notifications/devices/${encodeURIComponent(this.registeredToken)}`);
      this.registeredToken = null;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe Deep Link Parser for frequency URLs:
   * Supports `aadanpradan://frequency/145.800` or `https://aadanpradan.io/frequency/145.800`
   */
  public parseDeepLink(url: string): { type: 'frequency'; frequencyCode: string } | null {
    if (!url) return null;

    try {
      const regex = /(?:aadanpradan:\/\/frequency\/|https?:\/\/[^\/]+\/frequency\/)([\d.]+)/i;
      const match = url.match(regex);
      if (match && match[1] && isValidFrequencyCode(match[1])) {
        return {
          type: 'frequency',
          frequencyCode: normalizeFrequencyCode(match[1]),
        };
      }
    } catch {
      return null;
    }

    return null;
  }
}

export const notificationService = new NotificationService();
