import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/requireAuth';
import * as authController from '../controllers/authController';

export const authRouter = Router();

// Public endpoints — protected by strict auth rate limiter
authRouter.post('/register', authRateLimiter, authController.register);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/guest', authRateLimiter, authController.guest);
authRouter.post('/refresh', authRateLimiter, authController.refresh);

// Protected endpoints
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/logout-all', requireAuth, authController.logoutAll);
