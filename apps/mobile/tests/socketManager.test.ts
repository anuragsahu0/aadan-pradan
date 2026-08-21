import { describe, it, expect, vi, beforeEach } from 'vitest';
import { socketManager } from '../src/services/socket/socketManager';
import { useAuthStore } from '../src/store/authStore';

describe('Phase 5 Mobile Socket Manager', () => {
  beforeEach(() => {
    socketManager.disconnect();
    useAuthStore.setState({
      accessToken: null,
      isAuthenticated: false,
      user: null,
    });
  });

  it('should initialize in DISCONNECTED state when no auth token is present', () => {
    expect(socketManager.getConnectionState()).toBe('DISCONNECTED');
    expect(socketManager.isConnected()).toBe(false);
  });

  it('should return null on connect when user is unauthenticated', () => {
    const socket = socketManager.connect();
    expect(socket).toBeNull();
    expect(socketManager.getConnectionState()).toBe('DISCONNECTED');
  });

  it('should transition to CONNECTING when connect() is called with an active access token', () => {
    useAuthStore.setState({
      accessToken: 'valid.mock.token',
      isAuthenticated: true,
      user: {
        id: 'usr_test',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatar: null,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const states: string[] = [];
    const unsubscribe = socketManager.subscribeConnectionState((state) => {
      states.push(state);
    });

    const socket = socketManager.connect();
    expect(socket).not.toBeNull();
    expect(states).toContain('CONNECTING');

    unsubscribe();
  });

  it('should transition to DISCONNECTED when disconnect() is called', () => {
    useAuthStore.setState({
      accessToken: 'valid.mock.token',
      isAuthenticated: true,
      user: {
        id: 'usr_test',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatar: null,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    socketManager.connect();
    socketManager.disconnect();

    expect(socketManager.getConnectionState()).toBe('DISCONNECTED');
  });
});
