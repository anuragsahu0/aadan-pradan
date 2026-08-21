import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return;
  }

  // Handle known AppErrors
  if (err instanceof AppError) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
      },
      `[API Error] ${err.message}`
    );

    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn(
      {
        path: req.path,
        method: req.method,
        validationErrors: formattedErrors,
      },
      `[Validation Error] Invalid request payload on ${req.method} ${req.path}`
    );

    sendError(res, 'Validation failed for request parameters or body.', 400, 'VALIDATION_ERROR', formattedErrors);
    return;
  }

  // Handle unexpected internal server errors
  logger.error(
    {
      path: req.path,
      method: req.method,
      errorName: err.name,
      errorMessage: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    `[Unexpected Server Error] ${err.message}`
  );

  // Strictly NEVER leak stack traces or internal server state in API response
  const clientSafeMessage =
    env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
      ? err.message || 'An unexpected error occurred.'
      : 'An unexpected internal server error occurred. Please try again later.';

  sendError(res, clientSafeMessage, 500, 'INTERNAL_SERVER_ERROR');
}
