import type { Request, Response, NextFunction } from 'express';
import {
  getFrequencyDetails,
  createOrGetFrequency,
  joinFrequency as joinService,
  leaveFrequencyService,
  getFrequencyUsers as getUsersService,
  getUserRecentFrequencies as getRecentService,
} from '../services/frequencyService';
import { frequencyCodeParamSchema, createFrequencySchema } from '../validators/frequencyValidator';
import { sendSuccess } from '../utils/apiResponse';
import { getIceServers } from '../sockets/handlers/voiceSignalingHandler';
import { ForbiddenError, NotFoundError } from '../utils/appError';
import { findFrequencyByCode } from '../repositories/frequencyRepository';

export async function getFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequencyCode } = frequencyCodeParamSchema.parse(req.params);
    const userId = req.user?.userId;
    const result = await getFrequencyDetails(frequencyCode, userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function createFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createFrequencySchema.parse(req.body);
    const result = await createOrGetFrequency(data.frequencyCode, data.name);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function joinFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequencyCode } = frequencyCodeParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const result = await joinService(frequencyCode, userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function leaveFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequencyCode } = frequencyCodeParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const result = await leaveFrequencyService(frequencyCode, userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getFrequencyUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequencyCode } = frequencyCodeParamSchema.parse(req.params);
    const users = await getUsersService(frequencyCode);
    sendSuccess(res, { frequencyCode, count: users.length, users });
  } catch (err) {
    next(err);
  }
}

export async function getRecentFrequencies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const recent = await getRecentService(userId);
    sendSuccess(res, { recent });
  } catch (err) {
    next(err);
  }
}

export async function getVoiceConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequencyCode } = frequencyCodeParamSchema.parse(req.params);
    const userId = req.user!.userId;

    const freq = await findFrequencyByCode(frequencyCode);
    if (!freq) {
      throw new NotFoundError('Virtual frequency not found');
    }

    const { getPrismaClient } = await import('../repositories/prisma');
    const membership = await getPrismaClient().frequencyMembership.findUnique({
      where: {
        userId_frequencyId: {
          userId,
          frequencyId: freq.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active member of this frequency to access voice session');
    }

    const iceServers = getIceServers();
    sendSuccess(res, {
      iceServers,
      frequencyCode,
      maxBitrate: 32000,
    });
  } catch (err) {
    next(err);
  }
}
