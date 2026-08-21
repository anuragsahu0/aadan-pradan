import type { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/healthService';
import { sendSuccess } from '../utils/apiResponse';

export async function getHealthHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await healthService.getHealth();
    sendSuccess(res, health);
  } catch (error) {
    next(error);
  }
}

export async function getReadinessHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const readiness = await healthService.getReadiness();
    if (!readiness.ready) {
      res.status(503).json({ success: false, data: readiness });
      return;
    }
    sendSuccess(res, readiness);
  } catch (error) {
    next(error);
  }
}
