import type { AuthenticatedUser } from './user';

/** Tokens returned from login/register/refresh */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token expiry in seconds */
  expiresIn: number;
}

/** Full auth response from login/register */
export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

/** POST /auth/register body */
export interface RegisterRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

/** POST /auth/login body */
export interface LoginRequest {
  /** Email address or username */
  identifier: string;
  password: string;
  /** Optional device fingerprint */
  deviceId?: string;
}

/** POST /auth/refresh body */
export interface RefreshRequest {
  refreshToken: string;
}

/** JWT access token payload (minimal) */
export interface JwtPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/** Attached to req.user by requireAuth middleware */
export interface AuthContext {
  userId: string;
  sessionId: string;
}

/** PATCH /users/me body */
export interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
  avatar?: string | null;
}
