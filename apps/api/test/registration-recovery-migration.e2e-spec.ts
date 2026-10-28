import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'drizzle/0025_misty_wolfsbane.sql'),
  'utf8',
);

describe('registration recovery provenance migration (PostgreSQL)', () => {
  let pool: Pool;
  let client: PoolClient;
  let schema: string;

  async function applyMigration(): Promise<void> {
    await client.query('BEGIN');
    try {
      for (const statement of migration.split('--> statement-breakpoint')) {
        await client.query(statement);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    client = await pool.connect();
    schema = `registration_recovery_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(`
      CREATE TABLE firebase_identity_reservations (
        id uuid PRIMARY KEY,
        normalized_email varchar(255) NOT NULL,
        firebase_uid varchar(128) NOT NULL,
        purpose varchar(32) NOT NULL,
        state varchar(16) NOT NULL,
        user_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    client.release();
    await pool.end();
  });

  it('preserves pre-existing reservation identity and lifecycle while adding nullable non-secret recovery provenance', async () => {
    const id = randomUUID();
    const uid = randomUUID();
    await client.query(
      `INSERT INTO firebase_identity_reservations
       (id, normalized_email, firebase_uid, purpose, state)
       VALUES ($1, $2, $3, 'registration', 'confirmed')`,
      [id, 'preserved@example.test', uid],
    );

    await applyMigration();

    expect(
      (
        await client.query(
          `SELECT id, normalized_email, firebase_uid, purpose, state,
                  registration_display_name, registration_workspace_name,
                  registration_owner_acknowledgement
           FROM firebase_identity_reservations`,
        )
      ).rows,
    ).toEqual([
      {
        id,
        normalized_email: 'preserved@example.test',
        firebase_uid: uid,
        purpose: 'registration',
        state: 'confirmed',
        registration_display_name: null,
        registration_workspace_name: null,
        registration_owner_acknowledgement: null,
      },
    ]);
  });
});
