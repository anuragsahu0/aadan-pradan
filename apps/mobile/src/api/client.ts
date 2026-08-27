import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './networkConfig';

const DEFAULT_API_BASE_URL = API_BASE_URL;

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Token Refresh State ──────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  refreshQueue = [];
}

// ─── Request Interceptor — Inject Auth Token ──────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lazy import to avoid circular dependency
    const getToken = (): string | null => {
      try {
        // Access zustand store directly (synchronous — no hook required)
        const { useAuthStore } = require('../store/authStore');
        return useAuthStore.getState().accessToken;
      } catch {
        return null;
      }
    };

    const token = getToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Handle 401, Refresh, Retry ───────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and if we haven't already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(normalizeError(error));
    }

    // Skip refresh for the refresh endpoint itself (prevents infinite loop)
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(normalizeError(error));
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(normalizeError(err)));
    }

    isRefreshing = true;

    try {
      const { useAuthStore } = require('../store/authStore');
      const { storageService } = require('../services/storageService');
      const { refreshAuthToken, fetchMe } = require('./authApi');

      const rawRefreshToken = await storageService.getItem('ap_refresh_token');

      if (!rawRefreshToken) {
        // Auto-assign guest operator instantly so user never gets stuck
        await useAuthStore.getState().autoAssignGuest();
        const newToken = useAuthStore.getState().accessToken;
        processQueue(null, newToken);
        if (originalRequest.headers && newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      }

      const tokens = await refreshAuthToken(rawRefreshToken);

      // Store new refresh token
      await storageService.setItem('ap_refresh_token', tokens.refreshToken);

      // Update access token in store (memory only)
      useAuthStore.getState().setAccessToken(tokens.accessToken);

      // Refresh user profile
      try {
        const freshUser = await fetchMe(tokens.accessToken);
        useAuthStore.getState().setUser(freshUser);
      } catch {
        // Non-fatal: continue with old user data
      }

      processQueue(null, tokens.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      // If refresh failed (e.g. expired token), auto-reassign guest operator!
      try {
        const { useAuthStore } = require('../store/authStore');
        await useAuthStore.getState().autoAssignGuest();
        const newToken = useAuthStore.getState().accessToken;
        processQueue(null, newToken);
        if (originalRequest.headers && newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (autoErr) {
        processQueue(refreshError, null);
        return Promise.reject(normalizeError(refreshError));
      }
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Error Normalization ──────────────────────────────────────────────────────

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Network request failed. Please check your connection.';
    return new Error(message);
  }
  if (error instanceof Error) return error;
  return new Error('An unexpected error occurred.');
}
