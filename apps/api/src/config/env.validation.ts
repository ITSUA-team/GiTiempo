import { z } from 'zod';

const firebaseProjectIdSchema = z.string().min(1);
const firebaseClientEmailSchema = z.string().email();
const firebasePrivateKeySchema = z
  .string()
  .min(1)
  // `.env` files store PEM newlines as literal `\n`; normalize here.
  .transform((val) => val.replace(/\\n/g, '\n'));
const optionalNonEmptyString = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().url().optional(),
);

export const envSchema = z
  .object({
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

    // --- JWT (access + refresh token secrets) ---
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().min(1).default('15m'),
    JWT_REFRESH_TTL: z.string().min(1).default('7d'),
    JWT_ISSUER: z.string().min(1).default('gitiempo-api'),
    JWT_AUDIENCE: z.string().min(1).default('gitiempo-clients'),

    // --- Application URLs ---
    APP_URL: optionalUrl.default('http://localhost:3000'),
    USER_SPA_URL: z.string().url().default('http://localhost:5173'),
    ADMIN_SPA_URL: optionalUrl.default('http://localhost:5174'),

    // --- GitHub App ---
    GITHUB_APP_ID: optionalNonEmptyString,
    GITHUB_APP_CLIENT_ID: optionalNonEmptyString,
    GITHUB_APP_CLIENT_SECRET: optionalNonEmptyString,

    // --- Token encryption ---
    ENCRYPTION_KEY: optionalNonEmptyString,

    // --- Invite email delivery ---
    SMTP_HOST: optionalNonEmptyString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalNonEmptyString,
    SMTP_PASSWORD: optionalNonEmptyString,
    EMAIL_FROM: z.string().email().default('noreply@example.com'),
    INVITES_EMAIL_CONSOLE_FALLBACK: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),
    INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),

    // --- Firebase Admin ---
    // Required in non-test environments. In test mode the fake provider is used,
    // so missing values are allowed to keep CI runs hermetic.
    FIREBASE_PROJECT_ID: firebaseProjectIdSchema.optional(),
    FIREBASE_CLIENT_EMAIL: firebaseClientEmailSchema.optional(),
    FIREBASE_PRIVATE_KEY: firebasePrivateKeySchema.optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'test') return;
    const required: Array<keyof typeof env> = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
    ];
    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when NODE_ENV=${env.NODE_ENV}`,
        });
      }
    }

    if (
      (env.NODE_ENV === 'production' || !env.INVITES_EMAIL_CONSOLE_FALLBACK) &&
      !env.SMTP_HOST
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message:
          env.NODE_ENV === 'production'
            ? 'SMTP_HOST is required when NODE_ENV=production'
            : 'SMTP_HOST is required when INVITES_EMAIL_CONSOLE_FALLBACK=false',
      });
    }

    if (env.NODE_ENV === 'production') {
      const requiredGithub: Array<keyof typeof env> = [
        'GITHUB_APP_ID',
        'GITHUB_APP_CLIENT_ID',
        'GITHUB_APP_CLIENT_SECRET',
        'ENCRYPTION_KEY',
        'APP_URL',
        'USER_SPA_URL',
      ];
      for (const key of requiredGithub) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when NODE_ENV=production`,
          });
        }
      }

      if (
        env.ENCRYPTION_KEY &&
        Buffer.from(env.ENCRYPTION_KEY, 'base64').length !== 32
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENCRYPTION_KEY'],
          message: 'ENCRYPTION_KEY must be a base64-encoded 32-byte key',
        });
      }
    }
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
