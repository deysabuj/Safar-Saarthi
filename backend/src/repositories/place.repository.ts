import { prisma } from '../config/database.js';

export class PlaceRepository {
  static async findByDestination(destination: string) {
    const cleanDest = destination.split('(')[0].trim();

    return prisma.place.findMany({
      where: {
        destination: {
          contains: cleanDest,
          mode: 'insensitive',
        },
      },
    });
  }
}
