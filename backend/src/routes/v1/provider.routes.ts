import { Router } from 'express';
import { ProviderController } from '../../controllers/provider.controller.js';

export const providerRouter = Router();

// GET /api/v1/providers
providerRouter.get('/', ProviderController.list);

// GET /api/v1/providers/:code/sync-logs
providerRouter.get('/:code/sync-logs', ProviderController.getSyncLogs);
