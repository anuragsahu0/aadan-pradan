import { Router } from 'express';
import { healthRouter } from './healthRoutes';
import { configRouter } from './configRoutes';
import { authRouter } from './authRoutes';
import { userRouter } from './userRoutes';
import { frequencyRouter } from './frequencyRoutes';
import { notificationRouter } from './notificationRoutes';
import { adminRouter } from './adminRoutes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/frequencies', frequencyRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/admin', adminRouter);
