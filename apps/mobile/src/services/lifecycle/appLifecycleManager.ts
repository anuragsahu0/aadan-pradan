import { AppState, type AppStateStatus } from 'react-native';
import { usePttStore } from '../../features/voice/store/pttStore';
import { webrtcService } from '../../features/voice/services/webrtc.service';
import { socketManager } from '../socket/socketManager';
import { networkService } from '../networkService';

export type AppLifecycleState = 'active' | 'background' | 'inactive';

type LifecycleListener = (state: AppLifecycleState) => void;

class AppLifecycleManager {
  private currentState: AppLifecycleState = 'active';
  private listeners = new Set<LifecycleListener>();
  private subscription: any = null;

  public initialize(): void {
    if (this.subscription) return;

    this.currentState = (AppState.currentState as AppLifecycleState) || 'active';

    this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  public cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.listeners.clear();
  }

  public addListener(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): AppLifecycleState {
    return this.currentState;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousState = this.currentState;
    this.currentState = (nextAppState as AppLifecycleState) || 'active';

    // ─── Background Safety ────────────────────────────────────────────────────
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // 1. Immediately stop PTT floor transmission if user is talking
      const pttState = usePttStore.getState();
      if (pttState.isTalking) {
        pttState.releaseTalk(pttState.activeSpeaker?.id || '');
      }

      // 2. Guarantee microphone transmission is disabled
      webrtcService.setAudioTransmission(false);
    }

    // ─── Foreground Resume ────────────────────────────────────────────────────
    if (previousState !== 'active' && nextAppState === 'active') {
      // Check network and ensure socket is connected
      if (networkService.isOnline()) {
        socketManager.connect();
      }

      // Guarantee PTT starts in IDLE on app resume (prevent accidental transmission)
      if (usePttStore.getState().isTalking) {
        usePttStore.getState().resetPtt();
      }
    }

    // Notify registered listeners
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch {
        // Non-fatal
      }
    });
  };
}

export const appLifecycleManager = new AppLifecycleManager();
