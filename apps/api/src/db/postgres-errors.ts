export const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';
export const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface PostgresErrorDetails {
  code?: unknown;
  constraint?: unknown;
}

export function getPostgresError(error: unknown): PostgresErrorDetails | null {
  if (typeof error !== 'object' || error === null) return null;

  const candidate = error as PostgresErrorDetails & { cause?: unknown };
  if (candidate.code !== undefined || candidate.constraint !== undefined) {
    return candidate;
  }

  return getPostgresError(candidate.cause);
}
