import type { Response } from 'express';
import type { ApiResponse } from '@aadan-pradan/types';
import { SERVICE_NAME, APP_VERSION } from '@aadan-pradan/config';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const responsePayload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
      version: APP_VERSION,
    },
  };
  return res.status(statusCode).json(responsePayload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown
): Response {
  const responsePayload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
      version: APP_VERSION,
    },
  };
  return res.status(statusCode).json(responsePayload);
}
