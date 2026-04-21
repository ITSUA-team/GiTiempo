/**
 * Seed CLI for the API database.
 *
 * Run with:
 *   pnpm --filter @gitiempo/api db:seed
 *
 * Idempotent: re-running updates the same 3 users in place
 * (matched by `firebase_uid`). Safe to run repeatedly during dev.
 *
 * NOTE: this is a thin standalone script; it does NOT bootstrap Nest.
 * It reads `DATABASE_URL` from process env (the npm script loads .env
 * via Node's native `--env-file` flag) and writes via Drizzle directly.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { users } from '../users/schemas/users.schema';

interface SeedUser {
  firebaseUid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

const SEED_USERS: SeedUser[] = [
  {
    // Matches the test fake's default token `test:admin-uid:admin@example.com`
    // used by e2e suites and bruno's local environment.
    firebaseUid: 'admin-uid',
    email: 'admin@example.com',
    displayName: 'Admin (seed)',
    avatarUrl: null,
  },
  {
    firebaseUid: 'seed-user-1',
    email: 'alice@gitiempo.dev',
    displayName: 'Alice (seed)',
    avatarUrl: 'https://i.pravatar.cc/150?u=alice',
  },
  {
    firebaseUid: 'seed-user-2',
    email: 'bob@gitiempo.dev',
    displayName: 'Bob (seed)',
    avatarUrl: 'https://i.pravatar.cc/150?u=bob',
  },
  {
    firebaseUid: 'seed-user-3',
    email: 'carol@gitiempo.dev',
    displayName: 'Carol (seed)',
    avatarUrl: null,
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Create apps/api/.env (see .env.example).',
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema: { users } });

  try {
    // Sanity check — fail fast with a clear message if migrations
    // haven't been applied yet.
    await db.execute(sql`SELECT 1 FROM "users" LIMIT 1`).catch(() => {
      throw new Error(
        'Could not query "users" table. Did you run `pnpm --filter @gitiempo/api db:migrate`?',
      );
    });

    for (const user of SEED_USERS) {
      await db
        .insert(users)
        .values(user)
        .onConflictDoUpdate({
          target: users.firebaseUid,
          set: {
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            updatedAt: new Date(),
          },
        });
    }

    console.log(`Seeded ${SEED_USERS.length} users.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
