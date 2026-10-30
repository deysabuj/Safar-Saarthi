import { Router } from 'express';
import { HealthController } from '../../controllers/health.controller.js';

export const v1HealthRouter = Router();

// GET /api/v1/health
v1HealthRouter.get('/', HealthController.getHealth);
