import { PrismaClient } from '@prisma/client';
import {
  INITIAL_PROVIDERS,
  INITIAL_PLACES,
  INITIAL_ACCOMMODATIONS,
} from '../fixtures/indianTravelData.js';

const prisma = new PrismaClient();

export async function main() {
  console.log('[Seed] Starting database seeding for Safar Saarthi...');

  // 1. Seed Providers
  for (const prov of INITIAL_PROVIDERS) {
    await prisma.provider.upsert({
      where: { code: prov.code },
      update: {
        name: prov.name,
        category: prov.category,
        officialUrl: prov.officialUrl,
        isActive: true,
      },
      create: {
        code: prov.code,
        name: prov.name,
        category: prov.category,
        officialUrl: prov.officialUrl,
        isActive: true,
      },
    });
  }
  console.log(`[Seed] Seeded ${INITIAL_PROVIDERS.length} authorized providers.`);

  // Find MakeMyTrip provider for initial accommodations
  const mmtProvider = await prisma.provider.findUnique({
    where: { code: 'MAKEMYTRIP' },
  });

  // 2. Seed Accommodations
  for (const acc of INITIAL_ACCOMMODATIONS) {
    const existing = await prisma.accommodationOption.findFirst({
      where: { name: acc.name, destination: acc.destination },
    });

    if (!existing) {
      await prisma.accommodationOption.create({
        data: {
          destination: acc.destination,
          name: acc.name,
          type: acc.type,
          neighborhood: acc.neighborhood,
          proximityToHub: acc.proximityToHub,
          pricePerNight: acc.pricePerNight,
          rating: acc.rating,
          reviewsCount: acc.reviewsCount,
          amenities: acc.amenities,
          bookingUrl: acc.bookingUrl,
          isDemonstration: acc.isDemonstration,
          providerId: mmtProvider?.id,
        },
      });
    }
  }
  console.log(`[Seed] Seeded ${INITIAL_ACCOMMODATIONS.length} accommodations.`);

  // 3. Seed Places
  for (const place of INITIAL_PLACES) {
    const existing = await prisma.place.findFirst({
      where: { title: place.title, destination: place.destination },
    });

    if (!existing) {
      await prisma.place.create({
        data: {
          destination: place.destination,
          title: place.title,
          location: place.location,
          category: place.category,
          description: place.description,
          entryFee: place.entryFee,
          typicalDurationMinutes: place.typicalDurationMinutes,
          insiderTip: place.insiderTip,
          bestTimeToVisit: place.bestTimeToVisit,
        },
      });
    }
  }
  console.log(`[Seed] Seeded ${INITIAL_PLACES.length} landmark places.`);

  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
