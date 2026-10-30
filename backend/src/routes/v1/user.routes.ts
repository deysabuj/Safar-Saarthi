import { Router } from 'express';
import { z } from 'zod';
import { UserController } from '../../controllers/user.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';

export const userRouter = Router();

const updatePreferencesSchema = z.object({
  defaultPace: z.enum(['RELAXED', 'MODERATE', 'FAST_PACED']).optional(),
  dietary: z.enum(['VEG', 'JAIN', 'NON_VEG', 'ANY']).optional(),
  defaultTravelStyle: z.enum(['BUDGET', 'MID_RANGE', 'LUXURY']).optional(),
  preferredTransportModes: z.array(z.enum(['FLIGHT', 'TRAIN', 'BUS', 'CAB_TRANSFER'])).optional(),
  budgetLimitInr: z.number().positive().optional(),
  favoriteDestinations: z.array(z.string()).optional(),
});

const saveTripSchema = z.object({
  tripId: z.string().uuid('Trip ID must be a valid UUID'),
  title: z.string().min(1).optional(),
  notes: z.string().max(1000).optional(),
});

const recordSearchSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  travelers: z.number().int().min(1).default(1),
  budget: z.number().positive().optional(),
  preferredModes: z.array(z.string()).optional(),
});

const favoriteSchema = z.object({
  destination: z.string().min(2),
});

// All user routes below require authentication
userRouter.use(authenticate);

// Profile & Preferences
userRouter.get('/profile', UserController.getProfile);
userRouter.get('/me/profile', UserController.getProfile);
userRouter.put('/profile', validateRequest({ body: updatePreferencesSchema }), UserController.updatePreferences);
userRouter.put('/me/preferences', validateRequest({ body: updatePreferencesSchema }), UserController.updatePreferences);

// Saved Trips Management
userRouter.get('/saved-trips', UserController.getSavedTrips);
userRouter.get('/me/saved-trips', UserController.getSavedTrips);
userRouter.post('/saved-trips', validateRequest({ body: saveTripSchema }), UserController.saveTrip);
userRouter.post('/me/saved-trips', validateRequest({ body: saveTripSchema }), UserController.saveTrip);
userRouter.post('/saved-trips/:id/duplicate', UserController.duplicateTrip);
userRouter.post('/me/saved-trips/:id/duplicate', UserController.duplicateTrip);
userRouter.delete('/saved-trips/:id', UserController.deleteSavedTrip);
userRouter.delete('/me/saved-trips/:id', UserController.deleteSavedTrip);

// Search History
userRouter.get('/searches', UserController.getSearchHistory);
userRouter.get('/me/search-history', UserController.getSearchHistory);
userRouter.post('/searches', validateRequest({ body: recordSearchSchema }), UserController.recordSearch);
userRouter.post('/me/search-history', validateRequest({ body: recordSearchSchema }), UserController.recordSearch);
userRouter.delete('/searches/:id', UserController.deleteSearchHistory);
userRouter.delete('/me/search-history', UserController.deleteSearchHistory);

// Favorite Destinations
userRouter.get('/favorites', UserController.getFavorites);
userRouter.get('/me/favorites', UserController.getFavorites);
userRouter.post('/favorites', validateRequest({ body: favoriteSchema }), UserController.addFavorite);
userRouter.post('/me/favorites', validateRequest({ body: favoriteSchema }), UserController.addFavorite);
userRouter.delete('/favorites/:destination', UserController.removeFavorite);
userRouter.delete('/me/favorites/:destination', UserController.removeFavorite);
