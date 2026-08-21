import type { Request, Response, NextFunction } from 'express';
import { updateProfileSchema } from '../validators/authValidator';
import { getMyProfile, updateMyProfile } from '../services/userService';
import { sendSuccess } from '../utils/apiResponse';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await getMyProfile(req.user!.userId);
    sendSuccess(res, { user: profile });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateProfileSchema.parse(req.body);
    const profile = await updateMyProfile(req.user!.userId, data);
    sendSuccess(res, { user: profile });
  } catch (err) {
    next(err);
  }
}
