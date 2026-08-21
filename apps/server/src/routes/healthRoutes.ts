import { Router } from 'express';
import { getHealthHandler, getReadinessHandler } from '../controllers/healthController';

export const healthRouter = Router();

healthRouter.get('/', getHealthHandler);
healthRouter.get('/ready', getReadinessHandler);
