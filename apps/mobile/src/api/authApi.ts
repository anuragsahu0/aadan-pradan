import axios from 'axios';
import { apiClient } from './client';
import type {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  RegisterRequest,
  LoginRequest,
  AuthenticatedUser,
} from '@aadan-pradan/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
  if (!res.data.data) throw new Error('Invalid registration response');
  return res.data.data;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
  if (!res.data.data) throw new Error('Invalid login response');
  return res.data.data;
}

export async function guestLogin(deviceId?: string): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/guest', { deviceId });
  if (!res.data.data) throw new Error('Invalid guest login response');
  return res.data.data;
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Refresh auth tokens.
 * Uses a raw axios instance (not apiClient) to avoid triggering the 401 interceptor loop.
 */
export async function refreshAuthToken(refreshToken: string): Promise<AuthTokens> {
  const res = await axios.post<ApiResponse<{ tokens: AuthTokens }>>(`${BASE_URL}/auth/refresh`, {
    refreshToken,
  });
  if (!res.data.data?.tokens) throw new Error('Invalid refresh response');
  return res.data.data.tokens;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/** Best-effort logout — called by authStore. Uses raw token arg to avoid dependency on store. */
export async function callLogout(accessToken: string | null): Promise<void> {
  if (!accessToken) return;
  await axios.post(
    `${BASE_URL}/auth/logout`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

export async function callLogoutAll(): Promise<void> {
  await apiClient.post('/auth/logout-all');
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/** Fetch my profile — accepts explicit token for session restore flow */
export async function fetchMe(accessToken?: string): Promise<AuthenticatedUser> {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  const res = await apiClient.get<ApiResponse<{ user: AuthenticatedUser }>>('/users/me', {
    headers,
  });
  if (!res.data.data?.user) throw new Error('Invalid profile response');
  return res.data.data.user;
}

export async function updateMe(data: {
  displayName?: string;
  username?: string;
  avatar?: string | null;
}): Promise<AuthenticatedUser> {
  const res = await apiClient.patch<ApiResponse<{ user: AuthenticatedUser }>>('/users/me', data);
  if (!res.data.data?.user) throw new Error('Invalid update response');
  return res.data.data.user;
}
