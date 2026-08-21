import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { verifySessionActive } from '../services/authService';
import { UnauthorizedError, ForbiddenError } from '../utils/appError';
import { findUserById } from '../repositories/userRepository';
import type { AuthContext } from '@aadan-pradan/types';

/** Extends Express Request with authenticated user context */
declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

/**
 * requireAuth middleware
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT signature and expiry
 * 3. Validates session is active (not revoked, not expired)
 * 4. Verifies user is active and not SUSPENDED
 * 5. Attaches req.user = { userId, sessionId }
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. Please provide a valid access token.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token is missing.');
    }

    // Verify JWT — throws if invalid or expired
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Access token is invalid or has expired. Please refresh your session.');
    }

    // Validate session in DB / in-memory store
    const sessionActive = await verifySessionActive(payload.sessionId);
    if (!sessionActive) {
      throw new UnauthorizedError('Your session is no longer valid. Please log in again.');
    }

    // Validate account status (check for suspension)
    const user = await findUserById(payload.userId);

    if (!user || user.status === 'SUSPENDED' || !user.isActive) {
      throw new ForbiddenError('Account is suspended. Please contact administration.');
    }

    // Attach auth context — never direct client-supplied IDs
    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    next(err);
  }
}
