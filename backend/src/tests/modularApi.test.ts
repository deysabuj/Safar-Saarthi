import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../config/database.js';

describe('Modular API Endpoints (/api/v1)', () => {
  const app = createApp();
  let createdUserId: string;
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      await prisma.$connect();
      isDbAvailable = true;
    } catch {
      console.warn('[Modular API Tests] PostgreSQL database server not reachable at localhost:5432; live database tests skipped.');
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      if (createdUserId) {
        await prisma.user.deleteMany({
          where: { id: createdUserId },
        });
      }
      await prisma.$disconnect();
    }
  });

  // 1. Providers Modular API
  it('GET /api/v1/providers should return active authorized providers', async () => {
    const res = await request(app).get('/api/v1/providers');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('providers');
    expect(Array.isArray(res.body.data.providers)).toBe(true);

    const codes = res.body.data.providers.map((p: any) => p.code);
    expect(codes).toContain('IRCTC');
    expect(codes).toContain('INDIGO');
  });

  it('GET /api/v1/providers/IRCTC/sync-logs should return provider sync details', async () => {
    const res = await request(app).get('/api/v1/providers/IRCTC/sync-logs');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.provider.code).toBe('IRCTC');
  });

  // 2. Places Modular API
  it('GET /api/v1/places?destination=Jaipur should return landmark places in Jaipur', async () => {
    const res = await request(app).get('/api/v1/places?destination=Jaipur');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('places');
    expect(res.body.data.places.length).toBeGreaterThan(0);
    const place = res.body.data.places[0];
    expect(place.entryFeeInr !== undefined || place.entryFee !== undefined).toBe(true);
  });

  // 3. Accommodations Modular API
  it('GET /api/v1/accommodations?destination=Jaipur should return curated stays', async () => {
    const res = await request(app).get('/api/v1/accommodations?destination=Jaipur');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accommodations');
    expect(res.body.data.accommodations.length).toBeGreaterThan(0);
  });

  // 4. Users & Auth Modular API
  it('POST /api/v1/auth/register should register a user and GET /api/v1/users/me/profile fetch profile', async () => {
    const testEmail = `traveler_${Date.now()}@example.com`;
    const createRes = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      name: 'Aditya Sharma',
      password: 'SecurePassword123!',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.user).toHaveProperty('id');
    expect(createRes.body.data.user.email).toBe(testEmail);
    expect(createRes.body.data).toHaveProperty('token');

    createdUserId = createRes.body.data.user.id;
    const token = createRes.body.data.token;

    // Fetch authenticated profile
    const getRes = await request(app)
      .get('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Aditya Sharma');
  });

  // 5. AI Planning Modular API
  it('POST /api/v1/ai/runs should record agent execution log and GET /api/v1/ai/runs/:tripId fetch it', async () => {
    const fakeTripId = '11111111-1111-1111-1111-111111111111';

    // Create a temporary trip first to satisfy foreign key
    const tempTrip = await prisma.trip.create({
      data: {
        id: fakeTripId,
        origin: 'Delhi',
        destination: 'Agra',
        departureDate: new Date(),
        title: 'Delhi to Agra Day Trip',
      },
    });

    const runRes = await request(app).post('/api/v1/ai/runs').send({
      tripId: tempTrip.id,
      agentName: 'COORDINATOR',
      inputPayload: { query: 'Fastest route to Agra' },
      outputPayload: { recommendation: 'Gatimaan Express' },
      durationMs: 420,
    });

    expect(runRes.status).toBe(201);
    expect(runRes.body.success).toBe(true);
    expect(runRes.body.data.agentName).toBe('COORDINATOR');

    const listRes = await request(app).get(`/api/v1/ai/runs/${tempTrip.id}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.count).toBeGreaterThan(0);

    // Clean up
    await prisma.trip.delete({ where: { id: tempTrip.id } });
  });
});
