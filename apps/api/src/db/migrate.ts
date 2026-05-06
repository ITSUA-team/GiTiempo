import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';

const migrationsFolder = resolve(process.cwd(), 'drizzle');

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  if (!existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found: ${migrationsFolder}`);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle(pool, { schema });

  try {
    await migrate(db, { migrationsFolder });
    console.log(`Applied migrations from ${migrationsFolder}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
