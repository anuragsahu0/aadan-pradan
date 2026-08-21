import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/apiRouter';
import { NotFoundError } from './utils/appError';

export function createExpressApp(): Application {
  const app = express();

  // Baseline Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows WebRTC & dynamic assets on self-hosted web
    })
  );

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o: string) => o.trim());
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? true : (allowedOrigins.includes('*') ? '*' : allowedOrigins),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: true,
    })
  );

  // Request Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTP Request Logging
  app.use(requestLogger);

  // Rate Limiting on API
  app.use('/api', apiRateLimiter);

  // Mount API Routes
  app.use('/api', apiRouter);

  // Serve static production Web client if available
  const distPathCandidates = [
    path.resolve(process.cwd(), '../mobile/dist'),
    path.resolve(process.cwd(), 'apps/mobile/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  const distPath = distPathCandidates.find((p) => fs.existsSync(p));
  if (distPath) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Catch 404 for unhandled API routes
  app.use('/api', (req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
