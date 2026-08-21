import { networkService } from '../networkService';
import { socketManager } from '../socket/socketManager';
import { useAuthStore } from '../../store/authStore';
import { useFrequencyStore } from '../../store/frequencyStore';
import { usePttStore } from '../../features/voice/store/pttStore';

export interface RecoveryResult {
  recovered: boolean;
  networkOnline: boolean;
  authenticated: boolean;
  socketConnected: boolean;
  frequencyRestored: boolean;
}

class ConnectionRecoveryManager {
  private isRecovering = false;

  public async executeRecovery(): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        recovered: false,
        networkOnline: networkService.isOnline(),
        authenticated: useAuthStore.getState().isAuthenticated,
        socketConnected: socketManager.isConnected(),
        frequencyRestored: false,
      };
    }

    this.isRecovering = true;

    try {
      // 1. Check network
      const isOnline = networkService.isOnline();
      if (!isOnline) {
        return {
          recovered: false,
          networkOnline: false,
          authenticated: useAuthStore.getState().isAuthenticated,
          socketConnected: false,
          frequencyRestored: false,
        };
      }

      // 2. Check and restore auth session if needed
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated) {
        await authState.restoreSession();
      }

      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (!isAuthenticated) {
        return {
          recovered: false,
          networkOnline: true,
          authenticated: false,
          socketConnected: false,
          frequencyRestored: false,
        };
      }

      // 3. Connect/reconnect Socket.IO with valid token
      const socket = socketManager.connect();
      const isSocketConnected = !!socket;

      // 4. Verify & restore active frequency membership
      const freqState = useFrequencyStore.getState();
      let frequencyRestored = false;

      if (freqState.currentFrequencyCode) {
        try {
          await freqState.connectToFrequency(freqState.currentFrequencyCode);
          frequencyRestored = true;
        } catch {
          frequencyRestored = false;
        }
      }

      // 5. Always ensure PTT is IDLE after recovery (safety rule)
      usePttStore.getState().resetPtt();

      return {
        recovered: true,
        networkOnline: true,
        authenticated: true,
        socketConnected: isSocketConnected,
        frequencyRestored,
      };
    } finally {
      this.isRecovering = false;
    }
  }
}

export const connectionRecoveryManager = new ConnectionRecoveryManager();
