import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as userController from '../controllers/userController';

export const userRouter = Router();

userRouter.get('/me', requireAuth, userController.getMe);
userRouter.patch('/me', requireAuth, userController.updateMe);
