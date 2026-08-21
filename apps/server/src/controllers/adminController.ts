import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { auditService } from '../services/auditService';
import { collectSystemMetrics } from '../services/metricsService';
import { runStaleDataCleanup } from '../services/cleanupService';
import { sendSuccess } from '../utils/apiResponse';
import { z } from 'zod';

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

const searchUsersSchema = z.object({
  q: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getOverviewStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = searchUsersSchema.parse(req.query);
    const result = await adminService.searchUsers(query);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.userId;
    const targetUserId = req.params.userId;
    const { status } = updateUserStatusSchema.parse(req.body);

    const io = req.app.get('io');
    const result = await adminService.updateUserStatus(adminUserId, targetUserId, status, io);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getFrequencies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.getFrequencies(page, limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function deactivateFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.userId;
    const frequencyCode = req.params.frequencyCode;
    const io = req.app.get('io');

    await adminService.deactivateFrequency(adminUserId, frequencyCode, io);
    sendSuccess(res, { success: true, frequencyCode, isActive: false });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;

    const result = await auditService.getAuditLogs({ page, limit, action });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getSecuritySummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await adminService.getSecuritySummary();
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const metrics = await collectSystemMetrics();
    sendSuccess(res, metrics);
  } catch (err) {
    next(err);
  }
}

export async function triggerCleanup(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runStaleDataCleanup();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
