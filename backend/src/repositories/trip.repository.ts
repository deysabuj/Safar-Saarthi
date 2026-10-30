import { prisma } from '../config/database.js';
import { Trip, TripStatus, TravelMode } from '@prisma/client';

export class TripRepository {
  static async createTrip(params: {
    origin: string;
    destination: string;
    departureDate: Date;
    returnDate?: Date;
    travelers: number;
    budget?: number;
    userId?: string;
    title?: string;
  }): Promise<Trip> {
    const title = params.title || `${params.origin} to ${params.destination}`;

    const trip = await prisma.trip.create({
      data: {
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        travelers: params.travelers,
        totalBudget: params.budget ? params.budget : null,
        title,
        userId: params.userId,
        status: TripStatus.DRAFT,
      },
    });

    // Record SearchHistory
    await prisma.searchHistory.create({
      data: {
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        travelers: params.travelers,
        budget: params.budget ? params.budget : null,
        userId: params.userId,
        preferredModes: [TravelMode.FLIGHT, TravelMode.TRAIN, TravelMode.BUS],
      },
    });

    return trip;
  }

  static async findById(id: string) {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        transportOffers: {
          include: {
            provider: true,
          },
        },
        itineraryDays: {
          include: {
            activities: {
              include: {
                place: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        savedTrips: true,
      },
    });
  }

  static async saveTrip(params: {
    tripId: string;
    userId?: string;
    title?: string;
    notes?: string;
  }) {
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
    });

    if (!trip) return null;

    const savedTitle = params.title || trip.title;

    // Update trip status to SAVED
    await prisma.trip.update({
      where: { id: params.tripId },
      data: { status: TripStatus.SAVED },
    });

    return prisma.savedTrip.create({
      data: {
        tripId: params.tripId,
        userId: params.userId,
        title: savedTitle,
        notes: params.notes,
      },
      include: {
        trip: true,
      },
    });
  }
}
