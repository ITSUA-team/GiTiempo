import { z } from 'zod';

export const envSchema = z.object({
  // --- Application ---
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // --- Database ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // --- CORS ---
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  // --- Logging ---
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LOG_EXTENDED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // --- Swagger ---
  SWAGGER_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  SWAGGER_PATH: z.string().default('docs'),

  // --- Rate limiting ---
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup.
 * Compatible with NestJS ConfigModule's `validate` option.
 */
export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
