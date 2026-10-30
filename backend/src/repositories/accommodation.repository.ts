import { prisma } from '../config/database.js';
import { AccommodationType, Prisma } from '@prisma/client';

export interface AccommodationFilters {
  type?: AccommodationType;
  maxPrice?: number;
}

export class AccommodationRepository {
  static async findByDestination(destination: string, filters: AccommodationFilters = {}) {
    // Clean destination to match city name (e.g., "Jaipur (JAI)" -> "Jaipur")
    const cleanDest = destination.split('(')[0].trim();

    const where: Prisma.AccommodationOptionWhereInput = {
      destination: {
        contains: cleanDest,
        mode: 'insensitive',
      },
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.maxPrice) {
      where.pricePerNight = { lte: filters.maxPrice };
    }

    return prisma.accommodationOption.findMany({
      where,
      include: {
        provider: true,
      },
      orderBy: {
        rating: 'desc',
      },
    });
  }
}
