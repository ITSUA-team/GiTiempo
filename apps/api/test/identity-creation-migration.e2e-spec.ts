import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { expect, it } from 'vitest';

it('retains legacy uncertain registrations when upgrading creation outcome tracking', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TEMP TABLE firebase_identity_reservations (
        id integer,
        purpose text,
        state text,
        creation_outcome_pending boolean DEFAULT false
      );
      INSERT INTO firebase_identity_reservations VALUES
        (1, 'registration', 'reserved', false),
        (2, 'registration', 'reserved', null),
        (3, 'registration', 'resolved', false),
        (4, 'registration', 'bound', false),
        (5, 'invitation', 'reserved', false);
    `);
    const migration = await readFile(
      'drizzle/0031_small_iron_fist.sql',
      'utf8',
    );
    await client.query(migration);
    await client.query(`
      INSERT INTO firebase_identity_reservations (id, purpose, state)
      VALUES (6, 'registration', 'reserved');
    `);
    const { rows } = await client.query(
      'SELECT id, creation_outcome_pending AS pending FROM firebase_identity_reservations ORDER BY id',
    );
    expect(rows).toEqual([
      { id: 1, pending: true },
      { id: 2, pending: true },
      { id: 3, pending: false },
      { id: 4, pending: false },
      { id: 5, pending: false },
      { id: 6, pending: true },
    ]);
  } finally {
    await client.end();
  }
});
