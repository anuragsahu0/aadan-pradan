import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import * as adminController from '../controllers/adminController';

export const adminRouter = Router();

// All admin routes strictly enforce requireAuth AND requireAdmin
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/overview', adminController.getOverview);
adminRouter.get('/users', adminController.searchUsers);
adminRouter.patch('/users/:userId/status', adminController.updateUserStatus);
adminRouter.get('/frequencies', adminController.getFrequencies);
adminRouter.patch('/frequencies/:frequencyCode/status', adminController.deactivateFrequency);
adminRouter.get('/audit-logs', adminController.getAuditLogs);
adminRouter.get('/security/summary', adminController.getSecuritySummary);
adminRouter.get('/metrics', adminController.getMetrics);
adminRouter.post('/cleanup', adminController.triggerCleanup);
