import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().default(''),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  JWT_SECRET: z.string().default('dev-safar-saarthi-secret-key-change-in-prod'),

  // Amadeus for Developers Flight API Configuration
  AMADEUS_CLIENT_ID: z.string().optional(),
  AMADEUS_CLIENT_SECRET: z.string().optional(),
  AMADEUS_ENV: z.enum(['test', 'production']).default('test'),

  // Indian Railways (IRCTC / Authorized Gateway) Configuration
  IRCTC_API_KEY: z.string().optional(),
  IRCTC_API_URL: z.string().default('https://irctc-indian-railway-pnr-status.p.rapidapi.com'),
  IRCTC_API_HOST: z.string().default('irctc-indian-railway-pnr-status.p.rapidapi.com'),

  // Intercity Bus (RedBus / Aggregator Gateway) Configuration
  REDBUS_API_KEY: z.string().optional(),
  REDBUS_API_URL: z.string().default('https://api.redbus.in/v1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Configuration Error] Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
