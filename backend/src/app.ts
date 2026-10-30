import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { v1Router } from './routes/v1/index.js';
import { healthRouter } from './routes/health.js';
import { HealthController } from './controllers/health.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (Docker Nginx / Kubernetes Ingress / AWS ALB)
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use(securityHeaders);

  // Parse CORS origins (supports single origin or comma-delimited list)
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin '${origin}' is not authorized by Safar Saarthi`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    })
  );

  // Enforce explicit payload size limits to protect against memory exhaustion DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Structured Request Logger
  app.use(requestLogger);

  // General API Rate Limiting (120 req / minute per IP)
  // Protects backend against denial of service while accommodating fast automated workflows
  app.use(
    '/api',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 120,
      message: 'Too many requests to Safar Saarthi API. Please back off and retry shortly.',
    })
  );

  // Root container health probes (used by Docker Compose and Kubernetes)
  app.get('/health', HealthController.getHealth);
  app.get('/healthz', HealthController.getHealth);

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Safar Saarthi API Gateway',
      version: '0.2.0',
      description: 'AI-Powered Multi-Agent Travel Planning & Transport Comparison Platform for India',
      status: 'online',
      documentation: '/docs',
      health: {
        root: '/health',
        v1: '/api/v1/health',
        legacy: '/api/health',
      },
      api: {
        v1: '/api/v1',
      },
    });
  });

  // Versioned API Routes
  app.use('/api/v1', v1Router);

  // Legacy / Direct API Routes for backwards compatibility
  app.use('/api', healthRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested resource does not exist on Safar Saarthi API.',
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
