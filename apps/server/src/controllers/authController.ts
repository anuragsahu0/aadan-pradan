import type { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema, refreshSchema } from '../validators/authValidator';
import { registerUser, loginUser, refreshSession, logoutSession, logoutAllSessions } from '../services/authService';
import { sendSuccess } from '../utils/apiResponse';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    const userAgent = req.headers['user-agent'] ?? undefined;
    const result = await registerUser({ ...data, userAgent });
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const userAgent = req.headers['user-agent'] ?? undefined;
    const result = await loginUser({ ...data, userAgent });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function guest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userAgent = req.headers['user-agent'] ?? undefined;
    const deviceId = req.body?.deviceId ?? undefined;
    const { registerGuestOperator } = await import('../services/authService');
    const result = await registerGuestOperator({ deviceId, userAgent });
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await refreshSession(refreshToken);
    sendSuccess(res, { tokens });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, sessionId } = req.user!;
    await logoutSession(sessionId, userId);
    sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.user!;
    await logoutAllSessions(userId);
    sendSuccess(res, { message: 'All sessions have been revoked.' });
  } catch (err) {
    next(err);
  }
}
