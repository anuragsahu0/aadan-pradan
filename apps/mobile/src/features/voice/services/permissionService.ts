import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { MicrophonePermissionStatus } from '../types/voice.types';

class PermissionService {
  private currentStatus: MicrophonePermissionStatus = 'undetermined';

  /**
   * Check current microphone permission status without prompting
   */
  public async checkMicrophonePermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          this.currentStatus = result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'undetermined';
          return this.currentStatus;
        } catch {
          return this.currentStatus;
        }
      }
      return this.currentStatus;
    }

    try {
      const response = await Audio.getPermissionsAsync();
      this.currentStatus = response.granted ? 'granted' : response.canAskAgain ? 'undetermined' : 'denied';
      return this.currentStatus;
    } catch {
      return 'undetermined';
    }
  }

  /**
   * Request microphone permission from the user
   */
  public async requestMicrophonePermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop()); // release immediately
          this.currentStatus = 'granted';
          return 'granted';
        } catch {
          this.currentStatus = 'denied';
          return 'denied';
        }
      }
      return 'denied';
    }

    try {
      const response = await Audio.requestPermissionsAsync();
      this.currentStatus = response.granted ? 'granted' : 'denied';
      return this.currentStatus;
    } catch {
      this.currentStatus = 'denied';
      return 'denied';
    }
  }

  public getStatus(): MicrophonePermissionStatus {
    return this.currentStatus;
  }
}

export const permissionService = new PermissionService();
