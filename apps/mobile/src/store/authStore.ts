import { create } from 'zustand';
import { storageService } from '../services/storageService';
import { refreshAuthToken, fetchMe, callLogout, guestLogin } from '../api/authApi';
import { useUserStore } from './userStore';
import type { AuthenticatedUser } from '@aadan-pradan/types';

// SecureStore keys — never store raw accessToken here
const REFRESH_TOKEN_KEY = 'ap_refresh_token';
const USER_CACHE_KEY = 'ap_user_cache';

interface AuthState {
  user: AuthenticatedUser | null;
  /** Access token lives in memory only — never persisted */
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while restoring session on app startup */
  isInitializing: boolean;
  error: string | null;
}

interface AuthActions {
  /** Called after successful login or register */
  setAuth: (user: AuthenticatedUser, accessToken: string, refreshToken: string) => Promise<void>;
  /** Update access token after a refresh cycle (called by API client interceptor) */
  setAccessToken: (token: string) => void;
  /** Update user profile (called after PATCH /users/me) */
  setUser: (user: AuthenticatedUser) => void;
  /** Auto-assign a unique tactical guest operator identity */
  autoAssignGuest: () => Promise<AuthenticatedUser>;
  /** Restore session from SecureStore on app startup */
  restoreSession: () => Promise<void>;
  /** Logout: clear state and SecureStore */
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  setAuth: async (user, accessToken, refreshToken) => {
    // Persist refresh token securely; access token stays in memory
    await storageService.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Cache user profile for instant UI restore (non-sensitive)
    await storageService.setItem(USER_CACHE_KEY, JSON.stringify(user));
    useUserStore.getState().setUser(user);
    useUserStore.getState().setCallsign(user.displayName);
    set({ user, accessToken, isAuthenticated: true, error: null });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
  },

  setUser: (user) => {
    storageService.setItem(USER_CACHE_KEY, JSON.stringify(user)).catch(() => {});
    useUserStore.getState().setUser(user);
    useUserStore.getState().setCallsign(user.displayName);
    set({ user });
  },

  autoAssignGuest: async () => {
    set({ isLoading: true });
    try {
      const res = await guestLogin();
      await get().setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      return res.user;
    } catch {
      // Fallback in-memory guest operator
      const num = Math.floor(1000 + Math.random() * 9000);
      const phonetics = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'TANGO', 'VICTOR', 'ZULU'];
      const prefix = phonetics[Math.floor(Math.random() * phonetics.length)];
      const fallbackUser: AuthenticatedUser = {
        id: `usr_${prefix.toLowerCase()}_${num}`,
        username: `${prefix.toLowerCase()}_${num}`,
        displayName: `${prefix}-${num}`,
        email: `${prefix.toLowerCase()}_${num}@operator.aadanpradan.io`,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await get().setAuth(fallbackUser, `guest_access_token_${num}`, `guest_refresh_token_${num}`);
      return fallbackUser;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isInitializing: true });
    try {
      const refreshToken = await storageService.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        set({ isInitializing: false, isAuthenticated: false });
        return;
      }

      // Restore cached user for instant UI while refresh happens
      const cachedUserStr = await storageService.getItem(USER_CACHE_KEY);
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr) as AuthenticatedUser;
          set({ user: cachedUser });
        } catch {
          // Ignore corrupt cache
        }
      }

      // Refresh the access token
      const tokens = await refreshAuthToken(refreshToken);

      // Fetch fresh user profile
      const freshUser = await fetchMe(tokens.accessToken);

      await storageService.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      await storageService.setItem(USER_CACHE_KEY, JSON.stringify(freshUser));

      set({
        user: freshUser,
        accessToken: tokens.accessToken,
        isAuthenticated: true,
        isInitializing: false,
        error: null,
      });
    } catch {
      // Session restore failed — clean up and require login
      await storageService.deleteItem(REFRESH_TOKEN_KEY);
      await storageService.deleteItem(USER_CACHE_KEY);
      set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Best-effort server-side session revocation
      await callLogout(get().accessToken);
    } catch {
      // If network fails, still clear local session
    } finally {
      await storageService.deleteItem(REFRESH_TOKEN_KEY);
      await storageService.deleteItem(USER_CACHE_KEY);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

// Convenience selectors
export const selectUser = (s: AuthState & AuthActions) => s.user;
export const selectIsAuthenticated = (s: AuthState & AuthActions) => s.isAuthenticated;
export const selectIsInitializing = (s: AuthState & AuthActions) => s.isInitializing;
export const selectAccessToken = (s: AuthState & AuthActions) => s.accessToken;
