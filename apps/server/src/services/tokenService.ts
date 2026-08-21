import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { env } from '../config/env';
import type { JwtPayload } from '@aadan-pradan/types';

// ─── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId }, env.JWT_SECRET, {
    expiresIn: getAccessTokenExpirySeconds(),
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/** Generate a cryptographically random opaque refresh token */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** Hash refresh token with argon2id for secure DB storage */
export async function hashRefreshToken(rawToken: string): Promise<string> {
  return argon2.hash(rawToken, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
}

/** Verify a raw refresh token against its stored hash */
export async function verifyRefreshTokenHash(
  rawToken: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, rawToken);
  } catch {
    return false;
  }
}

// ─── Password ─────────────────────────────────────────────────────────────────

/** Hash a plain password with argon2id */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
}

/** Verify a plain password against its stored argon2id hash */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ACCESS_TOKEN_EXPIRES_IN string to seconds for client use */
export function getAccessTokenExpirySeconds(): number {
  const val = env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val.endsWith('m')) return parseInt(val, 10) * 60;
    if (val.endsWith('h')) return parseInt(val, 10) * 3600;
    if (val.endsWith('d')) return parseInt(val, 10) * 86400;
  }
  return 900; // default 15m
}

/** Session expiry date from now */
export function getRefreshTokenExpiryDate(): Date {
  const days = env.REFRESH_TOKEN_EXPIRES_DAYS || 30;
  const date = new Date();
  date.setDate(date.getDate() + Number(days));
  return date;
}
