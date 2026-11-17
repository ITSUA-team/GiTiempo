import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migrations = Object.fromEntries(
  [
    '0032_invoice_management.sql',
    '0035_invoice_historical_lines.sql',
    '0036_strange_gauntlet.sql',
  ].map((name) => [
    name,
    readFileSync(resolve(process.cwd(), 'drizzle', name), 'utf8'),
  ]),
);

describe('historical invoice migrations (PostgreSQL)', () => {
  let pool: Pool;
  let client: PoolClient;
  let schema: string;

  async function applyMigration(name: keyof typeof migrations): Promise<void> {
    await client.query('BEGIN');
    try {
      for (const statement of migrations[name].split(
        '--> statement-breakpoint',
      )) {
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
    schema = `invoice_upgrade_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(`
      CREATE TABLE workspace_settings (workspace_id uuid PRIMARY KEY, time_zone text NOT NULL);
      CREATE TABLE users (id uuid PRIMARY KEY, display_name text);
      CREATE TABLE tasks (id uuid PRIMARY KEY, title text);
      CREATE TABLE invoices (
        id uuid PRIMARY KEY, workspace_id uuid NOT NULL,
        created_at timestamptz NOT NULL, rounding_step_minutes integer NOT NULL,
        total_amount numeric NOT NULL
      );
      CREATE TABLE time_entries (
        id uuid PRIMARY KEY, invoice_id uuid, task_id uuid, user_id uuid,
        started_at timestamptz, ended_at timestamptz,
        duration_seconds integer, is_billable boolean, description text
      );
    `);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    client.release();
    await pool.end();
  });

  it('upgrades pre-document invoices and snapshots linked entries without changing identities or totals', async () => {
    const workspaceId = randomUUID();
    const invoiceId = randomUUID();
    const emptyInvoiceId = randomUUID();
    const userId = randomUUID();
    const taskId = randomUUID();
    const earlierEntryId = randomUUID();
    const laterEntryId = randomUUID();
    await client.query("INSERT INTO users VALUES ($1, 'Іван')", [userId]);
    await client.query("INSERT INTO tasks VALUES ($1, 'Historical task')", [
      taskId,
    ]);
    await client.query(
      `INSERT INTO invoices VALUES
        ($1, $3, '2026-01-01T00:00:00Z', 15, 125.50),
        ($2, $3, '2026-01-02T00:00:00Z', 15, 0)`,
      [invoiceId, emptyInvoiceId, workspaceId],
    );
    await client.query(
      `INSERT INTO time_entries VALUES
        ($1,$3,$4,$5,'2026-01-01T12:00:00Z','2026-01-01T12:15:01Z',901,true,'Later'),
        ($2,$3,$4,$5,'2026-01-01T10:00:00Z','2026-01-01T10:15:00Z',900,true,'Earlier')`,
      [laterEntryId, earlierEntryId, invoiceId, taskId, userId],
    );

    await applyMigration('0032_invoice_management.sql');
    await applyMigration('0035_invoice_historical_lines.sql');

    const { rows } = await client.query('SELECT * FROM invoices WHERE id=$1', [
      invoiceId,
    ]);
    expect(rows[0]).toMatchObject({
      id: invoiceId,
      workspace_id: workspaceId,
      total_amount: '125.50',
      revision: 1,
    });
    expect(rows[0].reference).toMatch(/^INV-/);
    expect(rows[0].document.timeEntries).toEqual([
      {
        id: earlierEntryId,
        taskId,
        userId,
        userName: 'Іван',
        taskName: 'Historical task',
        startedAt: '2026-01-01T10:00:00.000Z',
        endedAt: '2026-01-01T10:15:00.000Z',
        durationSeconds: 900,
        roundedDurationSeconds: 900,
        isBillable: true,
        description: 'Earlier',
      },
      {
        id: laterEntryId,
        taskId,
        userId,
        userName: 'Іван',
        taskName: 'Historical task',
        startedAt: '2026-01-01T12:00:00.000Z',
        endedAt: '2026-01-01T12:15:01.000Z',
        durationSeconds: 901,
        roundedDurationSeconds: 1800,
        isBillable: true,
        description: 'Later',
      },
    ]);
    expect(
      (
        await client.query('SELECT document FROM invoices WHERE id=$1', [
          emptyInvoiceId,
        ])
      ).rows[0].document,
    ).toEqual({ timeEntries: [] });
    expect(
      (await client.query('SELECT invoice_id FROM time_entries')).rows,
    ).toEqual([{ invoice_id: invoiceId }, { invoice_id: invoiceId }]);
  });

  it('preserves existing snapshots and unrelated document fields, and tolerates missing entry labels', async () => {
    await applyMigration('0032_invoice_management.sql');
    const workspaceId = randomUUID();
    const existingId = randomUUID();
    const missingId = randomUUID();
    const entryId = randomUUID();
    const document = {
      title: 'Saved',
      timeEntries: [
        { id: entryId, taskName: 'Original label', roundedDurationSeconds: 42 },
      ],
    };
    await client.query(
      `INSERT INTO invoices (id,workspace_id,created_at,rounding_step_minutes,total_amount,document)
       VALUES ($1,$3,now(),15,20,$4), ($2,$3,now(),15,10,'{"title":"Keep me"}')`,
      [existingId, missingId, workspaceId, document],
    );
    await client.query(
      `INSERT INTO time_entries VALUES ($1,$2,$3,$4,'2026-01-01T00:00:00Z','2026-01-01T00:01:00Z',60,true,NULL)`,
      [entryId, missingId, randomUUID(), randomUUID()],
    );
    await applyMigration('0035_invoice_historical_lines.sql');
    expect(
      (
        await client.query('SELECT document FROM invoices WHERE id=$1', [
          existingId,
        ])
      ).rows[0].document,
    ).toEqual(document);
    const saved = (
      await client.query('SELECT document FROM invoices WHERE id=$1', [
        missingId,
      ])
    ).rows[0].document;
    expect(saved.title).toBe('Keep me');
    expect(saved.timeEntries).toEqual([
      expect.objectContaining({
        id: entryId,
        userName: null,
        taskName: null,
        roundedDurationSeconds: 900,
      }),
    ]);
  });

  it('backfills issue dates in each workspace timezone with UTC fallback and no due date', async () => {
    await applyMigration('0032_invoice_management.sql');
    const cases = [
      {
        zone: 'Europe/Kyiv',
        created: '2026-01-01T23:30:00Z',
        expected: '2026-01-02',
      },
      {
        zone: 'America/Los_Angeles',
        created: '2026-01-01T00:30:00Z',
        expected: '2025-12-31',
      },
      { zone: null, created: '2026-01-01T23:30:00Z', expected: '2026-01-01' },
    ];
    const fixtures: Array<{ id: string; expected: string }> = [];
    for (const item of cases) {
      const id = randomUUID();
      const workspaceId = randomUUID();
      if (item.zone)
        await client.query('INSERT INTO workspace_settings VALUES ($1,$2)', [
          workspaceId,
          item.zone,
        ]);
      await client.query(
        'INSERT INTO invoices (id,workspace_id,created_at,rounding_step_minutes,total_amount) VALUES ($1,$2,$3,15,19.25)',
        [id, workspaceId, item.created],
      );
      fixtures.push({ ...item, id });
    }
    await applyMigration('0036_strange_gauntlet.sql');
    for (const fixture of fixtures) {
      const { rows } = await client.query(
        'SELECT issue_date::text, due_date, total_amount FROM invoices WHERE id=$1',
        [fixture.id],
      );
      expect(rows[0]).toEqual({
        issue_date: fixture.expected,
        due_date: null,
        total_amount: '19.25',
      });
    }
    await expect(
      client.query('UPDATE invoices SET due_date=issue_date-1 WHERE id=$1', [
        fixtures[0].id,
      ]),
    ).rejects.toMatchObject({ constraint: 'invoices_payment_dates_check' });
  });
});
