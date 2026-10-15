import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export type DrizzleDB = NodePgDatabase<typeof schema>;

export type DbTransaction = Parameters<
  Parameters<DrizzleDB['transaction']>[0]
>[0];
