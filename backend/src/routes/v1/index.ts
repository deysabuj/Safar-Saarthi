import { Router } from 'express';
import { tripRouter } from './trip.routes.js';
import { transportRouter } from './transport.routes.js';
import { accommodationRouter } from './accommodation.routes.js';
import { placeRouter } from './place.routes.js';
import { userRouter } from './user.routes.js';
import { providerRouter } from './provider.routes.js';
import { aiRouter } from './ai.routes.js';
import { authRouter } from './auth.routes.js';
import { v1HealthRouter } from './health.routes.js';

export const v1Router = Router();

// Modular API Areas
v1Router.use('/auth', authRouter);
v1Router.use('/trips', tripRouter);
v1Router.use('/transport', transportRouter);
v1Router.use('/accommodations', accommodationRouter);
v1Router.use('/places', placeRouter);
v1Router.use('/users', userRouter);
v1Router.use('/providers', providerRouter);
v1Router.use('/ai', aiRouter);
v1Router.use('/health', v1HealthRouter);
