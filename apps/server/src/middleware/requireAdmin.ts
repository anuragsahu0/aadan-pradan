import type { Request, Response, NextFunction } from 'express';
import { findUserById } from '../repositories/userRepository';
import { ForbiddenError, UnauthorizedError } from '../utils/appError';

/**
 * requireAdmin middleware
 * Must run AFTER requireAuth.
 * Verifies that the authenticated user possesses the ADMIN role.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required.');
    }

    const user = await findUserById(userId);

    if (!user || user.status === 'SUSPENDED' || !user.isActive) {
      throw new ForbiddenError('Account is suspended or invalid.');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Access forbidden: Administrator privileges required.');
    }

    next();
  } catch (err) {
    next(err);
  }
}
