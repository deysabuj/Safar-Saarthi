import { prisma } from '../config/database.js';
import { TravelMode, TransportCategory, Prisma } from '@prisma/client';

export interface TransportFilterOptions {
  mode?: TravelMode;
  category?: TransportCategory;
  maxCost?: number;
  sortBy?: 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE';
}

export class TransportRepository {
  static async findByTripId(tripId: string, filters: TransportFilterOptions = {}) {
    const where: Prisma.TransportOfferWhereInput = { tripId };

    if (filters.mode) {
      where.mode = filters.mode;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.maxCost) {
      where.totalCost = { lte: filters.maxCost };
    }

    let orderBy: Prisma.TransportOfferOrderByWithRelationInput = { totalCost: 'asc' };

    if (filters.sortBy === 'FASTEST') {
      orderBy = { durationMinutes: 'asc' };
    } else if (filters.sortBy === 'CHEAPEST') {
      orderBy = { totalCost: 'asc' };
    }

    const offers = await prisma.transportOffer.findMany({
      where,
      include: {
        provider: true,
      },
      orderBy,
    });

    // If BEST_VALUE, custom composite ranking (balance price and transit time)
    if (filters.sortBy === 'BEST_VALUE') {
      return offers.sort((a, b) => {
        const costA = Number(a.totalCost);
        const costB = Number(b.totalCost);
        const scoreA = costA * 0.6 + a.durationMinutes * 4;
        const scoreB = costB * 0.6 + b.durationMinutes * 4;
        return scoreA - scoreB;
      });
    }

    return offers;
  }

  static async createMany(offers: Prisma.TransportOfferCreateManyInput[]) {
    return prisma.transportOffer.createMany({
      data: offers,
    });
  }
}
