import type { Request, Response, NextFunction } from 'express';
import { configService } from '../services/configService';
import { sendSuccess } from '../utils/apiResponse';

export function getConfigHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const config = configService.getPublicConfig();
    sendSuccess(res, config);
  } catch (error) {
    next(error);
  }
}
