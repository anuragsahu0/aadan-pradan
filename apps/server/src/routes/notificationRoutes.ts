import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as notificationController from '../controllers/notificationController';

export const notificationRouter = Router();

notificationRouter.post('/devices', requireAuth, notificationController.registerDevice);
notificationRouter.delete('/devices/:token', requireAuth, notificationController.unregisterDevice);
notificationRouter.get('/preferences', requireAuth, notificationController.getPreferences);
notificationRouter.patch('/preferences', requireAuth, notificationController.updatePreferences);
