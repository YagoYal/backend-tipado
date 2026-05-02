import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  HTTPS_KEY_PATH: z.string().optional(),
  HTTPS_CERT_PATH: z.string().optional(),
})

export const env = envSchema.parse(process.env)
