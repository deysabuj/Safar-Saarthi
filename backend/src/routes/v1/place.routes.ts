import { Router } from 'express';
import { PlaceController } from '../../controllers/place.controller.js';

export const placeRouter = Router();

// GET /api/v1/places
placeRouter.get('/', PlaceController.list);

// GET /api/v1/places/:id
placeRouter.get('/:id', PlaceController.getById);
