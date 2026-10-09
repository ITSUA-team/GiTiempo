import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inspectGithubIdentityPreflight } from '../src/github/scripts/github-identity-preflight';

describe('GitHub identity migration (PostgreSQL)', () => {
  let pool: Pool;
  let client: PoolClient;
  let schema: string;
  const userIds = Array.from({ length: 6 }, () => randomUUID());
  const migration = readFileSync(
    resolve(process.cwd(), 'drizzle/0020_strong_hitman.sql'),
    'utf8',
  );

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
    schema = `github_migration_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(`
      CREATE TABLE github_connections (
        user_id uuid NOT NULL UNIQUE,
        github_user_id varchar(255) NOT NULL,
        login varchar(255) NOT NULL,
        avatar_url text,
        connected boolean NOT NULL,
        access_token_encrypted text,
        connected_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE github_oauth_states (
        user_id uuid NOT NULL,
        expires_at timestamptz NOT NULL
      );
    `);
    for (const userId of userIds) {
      await client.query(
        'INSERT INTO public.users (id, firebase_uid, email) VALUES ($1, $2, $3)',
        [userId, `migration-${userId}`, `migration-${userId}@example.test`],
      );
    }
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.query('DELETE FROM public.users WHERE id = ANY($1::uuid[])', [
      userIds,
    ]);
    client.release();
    await pool.end();
  });

  it('backfills only active credentials, preserves App rows, and enforces global ownership', async () => {
    await client.query(
      `INSERT INTO github_connections
       (user_id, github_user_id, login, connected, access_token_encrypted)
       VALUES ($1, '123', 'active', true, 'encrypted-app'),
              ($2, '123', 'historical', false, null),
              ($3, '456', 'incomplete', true, null)`,
      userIds.slice(0, 3),
    );
    await expect(inspectGithubIdentityPreflight(client)).resolves.toEqual({
      activeCandidates: 1,
      excludedDisconnectedOrIncomplete: 2,
      conflicts: [],
      plannedUnlinkUserIds: [],
    });
    await applyMigration();
    const links = await client.query(
      'SELECT user_id, github_user_id FROM github_account_links',
    );
    expect(links.rows).toEqual([
      { user_id: userIds[0], github_user_id: '123' },
    ]);
    expect(
      (await client.query('SELECT * FROM github_oauth_grants')).rows,
    ).toEqual([]);
    expect(
      (await client.query('SELECT * FROM github_connections')).rows,
    ).toHaveLength(3);
    await expect(
      client.query(
        'INSERT INTO github_account_links (user_id, github_user_id, login) VALUES ($1, $2, $3)',
        [userIds[1], '123', 'conflicting-owner'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      client.query(
        'INSERT INTO github_account_links (user_id, github_user_id, login) VALUES ($1, $2, $3)',
        [userIds[0], '789', 'second-identity'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('unlinks every duplicate owner and historical binding while preserving unrelated records', async () => {
    await client.query(
      `INSERT INTO github_connections
       (user_id, github_user_id, login, connected, access_token_encrypted)
       VALUES ($1, '123', 'first', true, 'encrypted-first'),
              ($2, '123', 'second', true, 'encrypted-second'),
              ($3, '123', 'third', true, 'encrypted-third'),
              ($4, '123', 'historical', false, 'old-encrypted-token'),
              ($5, '456', 'unambiguous', true, 'encrypted-unambiguous'),
              ($6, '789', 'incomplete', true, null)`,
      userIds,
    );
    await client.query(
      `INSERT INTO github_oauth_states (user_id, expires_at)
       SELECT unnest($1::uuid[]), now() + interval '5 minutes'`,
      [userIds],
    );
    await client.query(`
      CREATE TABLE preserved_workspace_history (user_id uuid, payload jsonb);
      INSERT INTO preserved_workspace_history
      SELECT user_id, '{"installation":987654,"task":42,"duration":3600,"session":"synthetic"}'::jsonb
      FROM github_connections;
    `);
    const usersBefore = (
      await client.query(
        'SELECT * FROM public.users WHERE id = ANY($1::uuid[]) ORDER BY id',
        [userIds],
      )
    ).rows;
    const historyBefore = (
      await client.query(
        'SELECT * FROM preserved_workspace_history ORDER BY user_id',
      )
    ).rows;
    const audit = await inspectGithubIdentityPreflight(client);
    expect(audit.activeCandidates).toBe(4);
    expect(audit.excludedDisconnectedOrIncomplete).toBe(2);
    expect(audit.conflicts).toEqual([
      {
        githubUserId: '123',
        userCount: 3,
        userIds: userIds.slice(0, 3).sort(),
      },
    ]);
    expect(audit.plannedUnlinkUserIds).toEqual(userIds.slice(0, 4).sort());
    await applyMigration();
    expect(
      (
        await client.query(
          'SELECT user_id, github_user_id FROM github_account_links',
        )
      ).rows,
    ).toEqual([{ user_id: userIds[4], github_user_id: '456' }]);
    expect(
      (
        await client.query(
          'SELECT user_id, github_user_id, access_token_encrypted FROM github_connections ORDER BY github_user_id',
        )
      ).rows,
    ).toEqual([
      {
        user_id: userIds[4],
        github_user_id: '456',
        access_token_encrypted: 'encrypted-unambiguous',
      },
      {
        user_id: userIds[5],
        github_user_id: '789',
        access_token_encrypted: null,
      },
    ]);
    expect(
      (await client.query('SELECT * FROM github_oauth_grants')).rows,
    ).toEqual([]);
    expect(
      (
        await client.query(
          'SELECT user_id FROM github_oauth_states ORDER BY user_id',
        )
      ).rows,
    ).toEqual(
      userIds
        .slice(4)
        .sort()
        .map((user_id) => ({ user_id })),
    );
    const generations = (
      await client.query(
        'SELECT user_id, generation, disconnected_at FROM github_authorization_generations ORDER BY user_id',
      )
    ).rows;
    expect(generations.map((row) => row.user_id)).toEqual(
      userIds.slice(0, 4).sort(),
    );
    for (const row of generations) {
      expect(row.generation).toBe(1);
      expect(row.disconnected_at).toBeInstanceOf(Date);
    }
    expect(
      (
        await client.query(
          'SELECT * FROM public.users WHERE id = ANY($1::uuid[]) ORDER BY id',
          [userIds],
        )
      ).rows,
    ).toEqual(usersBefore);
    expect(
      (
        await client.query(
          'SELECT * FROM preserved_workspace_history ORDER BY user_id',
        )
      ).rows,
    ).toEqual(historyBefore);
    expect((await inspectGithubIdentityPreflight(client)).conflicts).toEqual(
      [],
    );
    // No former owner is reserved: an explicitly new connection can claim it.
    await client.query(
      'INSERT INTO github_account_links (user_id, github_user_id, login) VALUES ($1, $2, $3)',
      [userIds[1], '123', 'newly-linked'],
    );
  });

  it('blocks legacy connection and callback-state writes until the migration transaction ends', async () => {
    const writer = await pool.connect();
    await client.query('BEGIN');
    try {
      for (const statement of migration.split('--> statement-breakpoint')) {
        await client.query(statement);
      }
      await writer.query(`SET search_path TO "${schema}", public`);
      await writer.query("SET lock_timeout = '100ms'");
      await expect(
        writer.query(
          `INSERT INTO github_connections (user_id, github_user_id, login, connected, access_token_encrypted)
           VALUES ($1, '123', 'concurrent-old-app', true, 'old-encrypted-token')`,
          [userIds[0]],
        ),
      ).rejects.toMatchObject({ code: '55P03' });
      await expect(
        writer.query(
          'INSERT INTO github_oauth_states (user_id, expires_at) VALUES ($1, now())',
          [userIds[0]],
        ),
      ).rejects.toMatchObject({ code: '55P03' });
    } finally {
      await client.query('ROLLBACK');
      writer.release();
    }
    expect(
      (await client.query('SELECT * FROM github_connections')).rows,
    ).toEqual([]);
    expect(
      (await client.query('SELECT * FROM github_oauth_states')).rows,
    ).toEqual([]);
  });

  it('rolls back duplicate cleanup and state invalidation if migration cannot finish', async () => {
    await client.query(
      `INSERT INTO github_connections (user_id, github_user_id, login, connected, access_token_encrypted)
       VALUES ($1, '123', 'first', true, 'encrypted-first'),
              ($2, '123', 'second', true, 'encrypted-second')`,
      userIds.slice(0, 2),
    );
    await client.query(
      'INSERT INTO github_oauth_states (user_id, expires_at) VALUES ($1, now())',
      [userIds[0]],
    );
    // Model a later migration failure inside the same Drizzle transaction.
    await client.query('BEGIN');
    try {
      await client.query(migration);
      await expect(
        client.query(
          'INSERT INTO github_account_links (user_id, github_user_id, login) VALUES ($1, $2, $3)',
          [randomUUID(), '456', 'missing-user'],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.query('ROLLBACK');
    }
    expect(
      (
        await client.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
          [schema, 'github_account_links'],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await client.query('SELECT * FROM github_connections')).rows,
    ).toHaveLength(2);
    expect(
      (await client.query('SELECT * FROM github_oauth_states')).rows,
    ).toHaveLength(1);
  });
});
