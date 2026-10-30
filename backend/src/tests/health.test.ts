import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health Endpoints Integration', () => {
  const app = createApp();

  it('GET /api/v1/health should return 200 with service and database health', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'safar-saarthi-backend');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status', 'connected');
    expect(res.body.database).toHaveProperty('latencyMs');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /health (container probe) should return 200 with database health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body.database).toHaveProperty('status', 'connected');
  });

  it('GET /healthz (k8s probe) should return 200 with database health', async () => {
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('GET /api/health (legacy) should return 200 with healthy status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'safar-saarthi-backend');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / should return 200 with gateway overview', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Safar Saarthi API Gateway');
    expect(res.body).toHaveProperty('status', 'online');
    expect(res.body).toHaveProperty('api');
  });

  it('GET /api/v1/unknown-route should return 404 with standard error JSON', async () => {
    const res = await request(app).get('/api/v1/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
  });
});
