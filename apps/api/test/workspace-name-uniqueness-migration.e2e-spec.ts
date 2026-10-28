import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'drizzle/0024_right_sage.sql'),
  'utf8',
);

describe('workspace name uniqueness removal migration (PostgreSQL)', () => {
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
    schema = `workspace_name_upgrade_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(`
      CREATE TABLE workspaces (
        id uuid PRIMARY KEY,
        name varchar(255) NOT NULL
      );
      CREATE TABLE workspace_settings (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL,
        time_zone varchar(64) NOT NULL
      );
      CREATE TABLE workspace_members (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role varchar(20) NOT NULL
      );
      CREATE UNIQUE INDEX workspaces_name_lookup_unique
      ON workspaces (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));
    `);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    client.release();
    await pool.end();
  });

  it('upgrades the old unique-name schema without changing workspace, settings, or membership IDs', async () => {
    const firstWorkspaceId = randomUUID();
    const secondWorkspaceId = randomUUID();
    const settingsId = randomUUID();
    const memberId = randomUUID();
    const memberUserId = randomUUID();
    await client.query(
      "INSERT INTO workspaces (id, name) VALUES ($1, 'First workspace'), ($2, 'Second workspace')",
      [firstWorkspaceId, secondWorkspaceId],
    );
    await client.query(
      "INSERT INTO workspace_settings (id, workspace_id, time_zone) VALUES ($1, $2, 'Europe/Kyiv')",
      [settingsId, firstWorkspaceId],
    );
    await client.query(
      "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES ($1, $2, $3, 'admin')",
      [memberId, firstWorkspaceId, memberUserId],
    );

    await applyMigration();
    await client.query(
      "UPDATE workspaces SET name = 'First workspace' WHERE id = $1",
      [secondWorkspaceId],
    );

    expect(
      (await client.query('SELECT id, name FROM workspaces ORDER BY id')).rows,
    ).toEqual(
      [
        { id: firstWorkspaceId, name: 'First workspace' },
        { id: secondWorkspaceId, name: 'First workspace' },
      ].sort((left, right) => left.id.localeCompare(right.id)),
    );
    expect(
      (
        await client.query(
          'SELECT id, workspace_id, time_zone FROM workspace_settings',
        )
      ).rows,
    ).toEqual([
      {
        id: settingsId,
        workspace_id: firstWorkspaceId,
        time_zone: 'Europe/Kyiv',
      },
    ]);
    expect(
      (
        await client.query(
          'SELECT id, workspace_id, user_id, role FROM workspace_members',
        )
      ).rows,
    ).toEqual([
      {
        id: memberId,
        workspace_id: firstWorkspaceId,
        user_id: memberUserId,
        role: 'admin',
      },
    ]);
  });
});
