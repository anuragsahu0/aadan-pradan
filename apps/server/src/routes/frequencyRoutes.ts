import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as frequencyController from '../controllers/frequencyController';

export const frequencyRouter = Router();

// User specific routes — declared first before parameterized :frequencyCode routes
frequencyRouter.get('/user/recent', requireAuth, frequencyController.getRecentFrequencies);

// Standard frequency collection routes
frequencyRouter.post('/', requireAuth, frequencyController.createFrequency);
frequencyRouter.get('/:frequencyCode', frequencyController.getFrequency);
frequencyRouter.post('/:frequencyCode/join', requireAuth, frequencyController.joinFrequency);
frequencyRouter.post('/:frequencyCode/leave', requireAuth, frequencyController.leaveFrequency);
frequencyRouter.get('/:frequencyCode/users', requireAuth, frequencyController.getFrequencyUsers);
frequencyRouter.get('/:frequencyCode/voice-config', requireAuth, frequencyController.getVoiceConfig);
