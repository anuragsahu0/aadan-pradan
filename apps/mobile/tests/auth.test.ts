import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/store/authStore';
import { storageService } from '../src/services/storageService';
import type { AuthenticatedUser } from '@aadan-pradan/types';

describe('Mobile AuthStore State Management', () => {
  const mockUser: AuthenticatedUser = {
    id: 'usr_test_123',
    username: 'anurag',
    displayName: 'Anurag Sahu',
    email: 'anurag@example.com',
    avatar: null,
    role: 'USER',
    status: 'ACTIVE',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: null,
  };

  beforeEach(async () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      error: null,
    });
  });

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set authenticated user and token on setAuth', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token-123', 'refresh-token-456');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe('anurag');
    expect(state.accessToken).toBe('access-token-123');

    const storedRefresh = await storageService.getItem('ap_refresh_token');
    expect(storedRefresh).toBe('refresh-token-456');
  });

  it('should update access token in memory only', () => {
    useAuthStore.getState().setAccessToken('new-access-token-789');
    expect(useAuthStore.getState().accessToken).toBe('new-access-token-789');
  });

  it('should update user profile via setUser', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    const updatedUser = { ...mockUser, displayName: 'Anurag Sahu (PRO)' };

    useAuthStore.getState().setUser(updatedUser);
    expect(useAuthStore.getState().user?.displayName).toBe('Anurag Sahu (PRO)');
  });

  it('should clear state and secure storage on logout', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token-123', 'refresh-token-456');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();

    const storedRefresh = await storageService.getItem('ap_refresh_token');
    expect(storedRefresh).toBeNull();
  });
});

describe('Mobile Storage Service Security', () => {
  it('should store and retrieve values correctly', async () => {
    await storageService.setItem('test_key', 'test_secret_value');
    const val = await storageService.getItem('test_key');
    expect(val).toBe('test_secret_value');

    await storageService.deleteItem('test_key');
    const deletedVal = await storageService.getItem('test_key');
    expect(deletedVal).toBeNull();
  });
});
