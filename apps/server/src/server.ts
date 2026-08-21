import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/apiRouter';
import { NotFoundError } from './utils/appError';

export function createExpressApp(): Application {
  const app = express();

  // Baseline Security Middleware
  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o: string) => o.trim());
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? true : (allowedOrigins.includes('*') ? '*' : allowedOrigins),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: true,
    })
  );

  // Rate Limiting
  app.use('/api', apiRateLimiter);

  // Request Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTP Request Logging
  app.use(requestLogger);

  // Mount API Routes
  app.use('/api', apiRouter);

  // Catch 404 for unhandled routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
