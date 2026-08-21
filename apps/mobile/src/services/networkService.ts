import { Platform } from 'react-native';
import * as Network from 'expo-network';

export type NetworkState = 'ONLINE' | 'OFFLINE';

type NetworkListener = (state: NetworkState) => void;

class NetworkService {
  private currentState: NetworkState = 'ONLINE';
  private listeners = new Set<NetworkListener>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.currentState = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      window.addEventListener('online', () => this.updateState('ONLINE'));
      window.addEventListener('offline', () => this.updateState('OFFLINE'));
    } else {
      try {
        const netState = await Network.getNetworkStateAsync();
        this.currentState = netState.isConnected && netState.isInternetReachable !== false ? 'ONLINE' : 'OFFLINE';
      } catch {
        this.currentState = 'ONLINE';
      }

      // Lightweight polling check every 10 seconds for mobile connectivity shifts
      this.pollInterval = setInterval(async () => {
        try {
          const state = await Network.getNetworkStateAsync();
          const isOnline = state.isConnected && state.isInternetReachable !== false;
          this.updateState(isOnline ? 'ONLINE' : 'OFFLINE');
        } catch {
          // Keep current state
        }
      }, 10000);
    }
  }

  private updateState(newState: NetworkState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.listeners.forEach((listener) => {
        try {
          listener(newState);
        } catch {
          // Ignore listener error
        }
      });
    }
  }

  public getNetworkState(): NetworkState {
    return this.currentState;
  }

  public isOnline(): boolean {
    return this.currentState === 'ONLINE';
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
