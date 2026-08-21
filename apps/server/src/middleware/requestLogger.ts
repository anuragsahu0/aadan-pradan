import { pinoHttp } from 'pino-http';
import crypto from 'node:crypto';
import { logger } from '../utils/logger';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers['x-request-id'];
    const id = typeof existingId === 'string' && existingId.trim() ? existingId : `req_${crypto.randomUUID()}`;
    res.setHeader('X-Request-ID', id);
    return id;
  },
  autoLogging: {
    ignore: (req) => {
      // Avoid spamming logs with frequent health-check pings in dev
      return req.url === '/api/health';
    },
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `[HTTP] ${req.method} ${req.url} completed with status ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `[HTTP] ${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
  },
});
