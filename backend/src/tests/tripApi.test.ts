import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../config/database.js';

describe('Trip API Integration (/api/v1/trips)', () => {
  const app = createApp();
  let createdTripId: string;
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      await prisma.$connect();
      isDbAvailable = true;
    } catch {
      console.warn('[Trip API Tests] PostgreSQL database server not reachable at localhost:5432; live database tests skipped.');
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      if (createdTripId) {
        await prisma.trip.deleteMany({
          where: { id: createdTripId },
        });
      }
      await prisma.$disconnect();
    }
  });

  // 1. Search validation failure: Missing fields
  it('POST /api/v1/trips/search should reject empty payload with 400', async () => {
    const res = await request(app).post('/api/v1/trips/search').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  // 2. Search validation failure: Origin equals Destination
  it('POST /api/v1/trips/search should reject identical origin and destination with 400', async () => {
    const res = await request(app).post('/api/v1/trips/search').send({
      origin: 'Delhi',
      destination: 'Delhi',
      departureDate: '2026-11-20',
      travelers: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error.details.some((d: any) => d.path === 'destination')).toBe(true);
  });

  // 3. Successful trip search
  it('POST /api/v1/trips/search should create trip and return multi-modal transport offers', async () => {
    const res = await request(app).post('/api/v1/trips/search').send({
      origin: 'New Delhi (DEL)',
      destination: 'Jaipur (JAI)',
      departureDate: '2026-11-20',
      travelers: 2,
      budget: 15000,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('trip');
    expect(res.body.data).toHaveProperty('transportOffers');

    const { trip, transportOffers } = res.body.data;
    expect(trip).toHaveProperty('id');
    expect(trip.origin).toBe('New Delhi (DEL)');
    expect(trip.destination).toBe('Jaipur (JAI)');
    expect(trip.travelers).toBe(2);
    expect(trip.budget).toBe(15000);

    expect(Array.isArray(transportOffers)).toBe(true);
    expect(transportOffers.length).toBeGreaterThan(0);

    // Save ID for subsequent tests
    createdTripId = trip.id;
  });

  // 4. Retrieve Trip by ID
  it('GET /api/v1/trips/:id should return trip details', async () => {
    const res = await request(app).get(`/api/v1/trips/${createdTripId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.id).toBe(createdTripId);
    expect(res.body.data).toHaveProperty('transportOffers');
  });

  it('GET /api/v1/trips/:id should return 400 for non-UUID id', async () => {
    const res = await request(app).get('/api/v1/trips/invalid-uuid-string');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/trips/:id should return 404 for non-existent UUID', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/api/v1/trips/${fakeUuid}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // 5. Get Transport offers with filtering & sorting
  it('GET /api/v1/trips/:id/transport should return transport offers with summary', async () => {
    const res = await request(app).get(`/api/v1/trips/${createdTripId}/transport`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('offers');
    expect(res.body.data.offers.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/trips/:id/transport?mode=TRAIN should filter offers by TRAIN mode', async () => {
    const res = await request(app).get(`/api/v1/trips/${createdTripId}/transport?mode=TRAIN`);

    expect(res.status).toBe(200);
    const { offers } = res.body.data;
    expect(offers.every((o: any) => o.mode === 'TRAIN')).toBe(true);
  });

  it('GET /api/v1/trips/:id/transport?sortBy=CHEAPEST should sort offers by ascending totalCost', async () => {
    const res = await request(app).get(`/api/v1/trips/${createdTripId}/transport?sortBy=CHEAPEST`);

    expect(res.status).toBe(200);
    const { offers } = res.body.data;
    for (let i = 0; i < offers.length - 1; i++) {
      expect(Number(offers[i].totalCost)).toBeLessThanOrEqual(Number(offers[i + 1].totalCost));
    }
  });

  // 6. Get Accommodation for trip
  it('GET /api/v1/trips/:id/accommodation should return stays for the trip destination', async () => {
    const res = await request(app).get(`/api/v1/trips/${createdTripId}/accommodation`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accommodations');
    expect(Array.isArray(res.body.data.accommodations)).toBe(true);
    expect(res.body.data.accommodations.length).toBeGreaterThan(0);
  });

  // 7. Generate or Get Itinerary
  it('POST /api/v1/trips/:id/itinerary should generate day-wise itinerary with activities', async () => {
    const res = await request(app).post(`/api/v1/trips/${createdTripId}/itinerary`).send({
      pace: 'MODERATE',
      style: 'MID_RANGE',
      dietary: 'VEG',
      days: 3,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('days');
    
    const budget = res.body.data.budgetBreakdown || res.body.data.budgetSummary;
    expect(budget).toBeDefined();

    const { days } = res.body.data;
    expect(days.length).toBe(3);
    expect(days[0]).toHaveProperty('activities');
    expect(days[0].activities.length).toBeGreaterThan(0);
    expect(budget.grandTotalInr || budget.estimatedGrandTotalInr).toBeGreaterThan(0);
  });

  // 8. Save Trip
  it('POST /api/v1/trips/:id/save should mark trip as saved and create SavedTrip', async () => {
    const res = await request(app).post(`/api/v1/trips/${createdTripId}/save`).send({
      title: 'Our Jaipur Vacation 2026',
      notes: 'Remember to visit Amber fort in the morning',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Our Jaipur Vacation 2026');
    expect(res.body.data.notes).toBe('Remember to visit Amber fort in the morning');
  });
});
