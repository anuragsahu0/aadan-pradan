import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionState,
  FrequencyUsersPayload,
  FrequencyStatePayload,
  PresencePayload,
  UserSummary,
} from '@aadan-pradan/types';
import { useAuthStore } from '../../store/authStore';
import { networkService } from '../networkService';
import { SOCKET_BASE_URL } from '../../api/networkConfig';

const SOCKET_URL = SOCKET_BASE_URL;

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type ConnectionStateListener = (state: ConnectionState) => void;

class SocketManager {
  private socket: AppSocket | null = null;
  private connectionState: ConnectionState = 'DISCONNECTED';
  private stateListeners = new Set<ConnectionStateListener>();
  private currentFrequency: string | null = null;
  private frequencyUsersListener: ((payload: FrequencyUsersPayload) => void) | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    this.networkUnsubscribe = networkService.subscribe((netState) => {
      if (netState === 'OFFLINE') {
        this.updateConnectionState('DISCONNECTED');
      } else if (netState === 'ONLINE' && useAuthStore.getState().isAuthenticated && !this.isConnected()) {
        this.connect();
      }
    });
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.connectionState === 'CONNECTED' && !!this.socket?.connected;
  }

  private updateConnectionState(newState: ConnectionState) {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      this.stateListeners.forEach((listener) => {
        try {
          listener(newState);
        } catch {
          // Non-fatal
        }
      });
    }
  }

  public subscribeConnectionState(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Connect and authenticate socket
   */
  public connect(): AppSocket | null {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      this.updateConnectionState('DISCONNECTED');
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.updateConnectionState('CONNECTING');

    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.setupSocketEvents(this.socket);
    } else {
      this.socket.auth = { token };
      this.socket.connect();
    }

    return this.socket;
  }

  private setupSocketEvents(socket: AppSocket) {
    socket.on('connect', () => {
      this.updateConnectionState('CONNECTED');

      // Re-join active virtual frequency after reconnect if tuned
      if (this.currentFrequency) {
        this.joinFrequency(this.currentFrequency, this.frequencyUsersListener || undefined).catch(() => {});
      }
    });

    socket.on('connection:ready', () => {
      this.updateConnectionState('CONNECTED');
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        this.updateConnectionState('DISCONNECTED');
      } else {
        this.updateConnectionState('RECONNECTING');
      }
    });

    socket.on('connect_error', () => {
      const freshToken = useAuthStore.getState().accessToken;
      if (socket && freshToken) {
        socket.auth = { token: freshToken };
      }
      this.updateConnectionState('RECONNECTING');
    });
  }

  /**
   * Update auth token on existing socket (called after refresh)
   */
  public updateAuthToken(token: string) {
    if (this.socket) {
      this.socket.auth = { token };
      if (!this.socket.connected) {
        this.socket.connect();
      }
    }
  }

  /**
   * Join a virtual frequency room
   */
  public async joinFrequency(
    frequencyCode: string,
    onUsersUpdate?: (payload: FrequencyUsersPayload) => void
  ): Promise<{ success: boolean; error?: string }> {
    const socket = this.connect();
    if (!socket) {
      return { success: false, error: 'Authentication required to connect' };
    }

    this.currentFrequency = frequencyCode;

    if (this.frequencyUsersListener) {
      socket.off('frequency:users', this.frequencyUsersListener);
    }

    if (onUsersUpdate) {
      this.frequencyUsersListener = onUsersUpdate;
      socket.on('frequency:users', this.frequencyUsersListener);
    }

    const userId = useAuthStore.getState().user?.id || '';

    return new Promise((resolve) => {
      socket.emit('frequency:join', { frequencyCode, userId }, (res) => {
        resolve(res || { success: true });
      });
    });
  }

  /**
   * Leave current virtual frequency room
   */
  public async leaveFrequency(frequencyCode: string): Promise<{ success: boolean }> {
    if (!this.socket) return { success: true };

    if (this.frequencyUsersListener) {
      this.socket.off('frequency:users', this.frequencyUsersListener);
      this.frequencyUsersListener = null;
    }

    this.currentFrequency = null;
    const userId = useAuthStore.getState().user?.id || '';

    return new Promise((resolve) => {
      this.socket!.emit('frequency:leave', { frequencyCode, userId }, (res) => {
        resolve(res || { success: true });
      });
    });
  }

  /**
   * Disconnect socket cleanly (e.g. on logout)
   */
  public disconnect() {
    if (this.socket) {
      if (this.frequencyUsersListener) {
        this.socket.off('frequency:users', this.frequencyUsersListener);
        this.frequencyUsersListener = null;
      }
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentFrequency = null;
    this.updateConnectionState('DISCONNECTED');
  }

  public destroy() {
    this.disconnect();
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.stateListeners.clear();
  }
}

export const socketManager = new SocketManager();
