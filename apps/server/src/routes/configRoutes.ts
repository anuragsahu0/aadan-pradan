import { Router } from 'express';
import { getConfigHandler } from '../controllers/configController';

export const configRouter = Router();

/**
 * @route   GET /api/config
 * @desc    Get public server configuration & capabilities
 * @access  Public
 */
configRouter.get('/', getConfigHandler);
