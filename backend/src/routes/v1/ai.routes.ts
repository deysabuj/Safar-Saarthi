import { Router } from 'express';
import { AiController } from '../../controllers/ai.controller.js';

export const aiRouter = Router();

// POST /api/v1/ai/plan
aiRouter.post('/plan', AiController.planTrip);

// GET /api/v1/ai/runs/:tripId
aiRouter.get('/runs/:tripId', AiController.getRuns);

// POST /api/v1/ai/runs
aiRouter.post('/runs', AiController.recordRun);
