import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { AppError } from '../errors/AppError.js';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId || (req.params?.id as string);
      if (!userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const user = await UserService.getUserProfile(userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const updated = await UserService.updatePreferences(userId, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavedTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const trips = await UserService.getSavedTrips(userId);
      res.status(200).json({
        success: true,
        data: {
          count: trips.length,
          savedTrips: trips,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const { tripId, title, notes } = req.body;
      const saved = await UserService.saveTrip(userId, tripId, title, notes);
      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }

  static async duplicateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const savedTripId = req.params.id as string;
      const duplicated = await UserService.duplicateSavedTrip(userId, savedTripId);
      res.status(201).json({
        success: true,
        data: duplicated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSavedTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const savedTripId = req.params.id as string;
      await UserService.deleteSavedTrip(userId, savedTripId);
      res.status(200).json({
        success: true,
        message: 'Saved trip deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const history = await UserService.getSearchHistory(userId);
      res.status(200).json({
        success: true,
        data: {
          count: history.length,
          searches: history,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const item = await UserService.recordSearch(userId, req.body);
      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const searchId = req.params.id as string;
      await UserService.deleteSearchHistory(userId, searchId);
      res.status(200).json({
        success: true,
        message: 'Search history entry removed',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const favorites = await UserService.getFavorites(userId);
      res.status(200).json({
        success: true,
        data: favorites,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { destination } = req.body;
      const favorites = await UserService.addFavorite(userId, destination);
      res.status(200).json({
        success: true,
        data: favorites,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const destination = req.params.destination as string;
      const favorites = await UserService.removeFavorite(userId, destination);
      res.status(200).json({
        success: true,
        data: favorites,
      });
    } catch (error) {
      next(error);
    }
  }
}
