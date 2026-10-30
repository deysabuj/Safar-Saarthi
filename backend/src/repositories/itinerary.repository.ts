import { prisma } from '../config/database.js';
import { ActivityCategory } from '@prisma/client';

export interface CreateDayInput {
  dayNumber: number;
  theme: string;
  date?: Date;
  dailyBudgetEstimate: number;
  localTransportTip?: string;
  activities: {
    placeId?: string;
    timeSlot: string;
    title: string;
    location: string;
    description: string;
    entryFee: number;
    durationMinutes: number;
    category: ActivityCategory;
    insiderTip?: string;
    orderIndex: number;
  }[];
}

export class ItineraryRepository {
  static async findByTripId(tripId: string) {
    return prisma.itineraryDay.findMany({
      where: { tripId },
      include: {
        activities: {
          include: {
            place: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    });
  }

  static async createDays(tripId: string, days: CreateDayInput[]) {
    // Transaction to safely replace or insert days
    return prisma.$transaction(async (tx) => {
      // Remove any existing days for this trip
      await tx.itineraryDay.deleteMany({
        where: { tripId },
      });

      // Verify which candidate placeIds exist in database to avoid foreign key violations
      const candidatePlaceIds = Array.from(
        new Set(
          days.flatMap((d) => d.activities.map((a) => a.placeId).filter((id): id is string => Boolean(id)))
        )
      );

      const existingPlaces = candidatePlaceIds.length > 0
        ? await tx.place.findMany({
            where: { id: { in: candidatePlaceIds } },
            select: { id: true },
          }).catch(() => [])
        : [];
      const validPlaceIds = new Set(existingPlaces.map((p) => p.id));

      const createdDays = [];

      for (const day of days) {
        const createdDay = await tx.itineraryDay.create({
          data: {
            tripId,
            dayNumber: day.dayNumber,
            theme: day.theme,
            date: day.date,
            dailyBudgetEstimate: day.dailyBudgetEstimate,
            localTransportTip: day.localTransportTip,
            activities: {
              create: day.activities.map((act) => ({
                placeId: act.placeId && validPlaceIds.has(act.placeId) ? act.placeId : null,
                timeSlot: act.timeSlot,
                title: act.title,
                location: act.location,
                description: act.description,
                entryFee: act.entryFee,
                durationMinutes: act.durationMinutes,
                category: act.category,
                insiderTip: act.insiderTip,
                orderIndex: act.orderIndex,
              })),
            },
          },
          include: {
            activities: true,
          },
        });
        createdDays.push(createdDay);
      }

      return createdDays;
    });
  }
}
