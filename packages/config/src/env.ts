import { z } from 'zod';
import { DEFAULT_PORT, DEFAULT_HOST, MAX_USERS_PER_FREQUENCY, DEFAULT_FREQUENCY } from './constants';

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  HOST: z.string().default(DEFAULT_HOST),
  CORS_ORIGIN: z.string().default('http://localhost:8081,http://localhost:19006,http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('dev-insecure-jwt-secret-min-16-characters'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-insecure-refresh-secret-min-16-chars'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  MAX_USERS_PER_FREQUENCY: z.coerce.number().int().min(1).max(100).default(MAX_USERS_PER_FREQUENCY),
  MAX_TALK_DURATION_MS: z.coerce.number().int().positive().default(30000),
  DEFAULT_FREQUENCY: z.string().default(DEFAULT_FREQUENCY),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // WebRTC ICE STUN/TURN Configuration (Phase 6)
  WEBRTC_STUN_URL: z.string().default('stun:stun.l.google.com:19302'),
  WEBRTC_TURN_URL: z.string().optional(),
  WEBRTC_TURN_USERNAME: z.string().optional(),
  WEBRTC_TURN_CREDENTIAL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates environment variables and throws clear, developer-friendly errors if misconfigured.
 */
export function validateServerEnv(rawEnv: Record<string, unknown> = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - [${err.path.join('.')}]: ${err.message}`)
      .join('\n');

    throw new Error(
      `\n❌ [Aadan Pradan Config Error] Environment variable validation failed:\n${formattedErrors}\n\nPlease check your .env or .env.example file.\n`
    );
  }

  // Strict check for production environments
  if (result.data.NODE_ENV === 'production') {
    if (!result.data.DATABASE_URL) {
      throw new Error(
        '❌ [Aadan Pradan Config Error] DATABASE_URL is strictly required when running in production mode.'
      );
    }
    if (result.data.JWT_SECRET.includes('dev-insecure')) {
      throw new Error(
        '❌ [Aadan Pradan Config Error] Insecure default JWT_SECRET cannot be used in production mode.'
      );
    }
  }

  return result.data;
}
