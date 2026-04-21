/**
 * Central schema barrel file.
 *
 * Feature modules own their schemas (e.g. users/users.schema.ts).
 * This file re-exports everything so Drizzle config and the DB
 * module have a single entry point.
 */
export * from '../users/schemas/users.schema';
export * from '../auth/schemas/refresh-tokens.schema';
