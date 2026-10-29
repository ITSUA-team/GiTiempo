import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { assertE2eDatabase } from './e2e-database';

const safeEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/gitiempo_e2e',
};

function clientFor(databaseName: string) {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [{ name: databaseName }] }),
  };
}

describe('assertE2eDatabase', () => {
  it('accepts the configured isolated database after checking its real identity', async () => {
    const client = clientFor('gitiempo_e2e');

    await expect(
      assertE2eDatabase(safeEnvironment, () => client),
    ).resolves.toBe('gitiempo_e2e');

    expect(client.query).toHaveBeenCalledWith(
      'SELECT current_database() AS name',
    );
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('rejects a development database before opening a connection', async () => {
    const createClient = vi.fn();

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          DATABASE_URL: 'postgresql://localhost/gi_tiempo',
        },
        createClient,
      ),
    ).rejects.toThrow('Unsafe E2E database');

    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects malformed isolated database suffixes before opening a connection', async () => {
    const createClient = vi.fn();

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          DATABASE_URL: 'postgresql://localhost/gitiempo_e2e_',
        },
        createClient,
      ),
    ).rejects.toThrow('Unsafe E2E database');

    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects a missing database URL and a non-test environment', async () => {
    await expect(assertE2eDatabase({ NODE_ENV: 'test' })).rejects.toThrow(
      'DATABASE_URL is required',
    );
    await expect(
      assertE2eDatabase({ ...safeEnvironment, NODE_ENV: 'development' }),
    ).rejects.toThrow('NODE_ENV=test');
  });

  it('requires a PostgreSQL URL before opening a connection', async () => {
    const createClient = vi.fn();

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          DATABASE_URL: 'https://example.com/gitiempo_e2e',
        },
        createClient,
      ),
    ).rejects.toThrow('valid PostgreSQL URL');

    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects a connection whose real database differs from the configured URL', async () => {
    const client = clientFor('gi_tiempo');

    await expect(
      assertE2eDatabase(safeEnvironment, () => client),
    ).rejects.toThrow('Unsafe E2E database');

    expect(client.end).toHaveBeenCalledOnce();
  });

  it('rejects a safe but different connected database', async () => {
    const client = clientFor('gitiempo_e2e_redirected');

    await expect(
      assertE2eDatabase(safeEnvironment, () => client),
    ).rejects.toThrow('Connected database does not match');

    expect(client.end).toHaveBeenCalledOnce();
  });

  it('requires a requested E2E database name to match the URL and connection', async () => {
    const client = clientFor('gitiempo_e2e_review');

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          DATABASE_URL: 'postgresql://localhost/gitiempo_e2e_review',
          E2E_DATABASE_NAME: 'gitiempo_e2e_review',
        },
        () => client,
      ),
    ).resolves.toBe('gitiempo_e2e_review');
  });

  it('rejects an expected safe name that differs from the configured safe name', async () => {
    const createClient = vi.fn();

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          E2E_DATABASE_NAME: 'gitiempo_e2e_review',
        },
        createClient,
      ),
    ).rejects.toThrow('DATABASE_URL does not match E2E_DATABASE_NAME');

    expect(createClient).not.toHaveBeenCalled();
  });

  it('closes the client when establishing the database connection fails', async () => {
    const client = clientFor('gitiempo_e2e');
    client.connect.mockRejectedValue(new Error('connection failed'));

    await expect(
      assertE2eDatabase(safeEnvironment, () => client),
    ).rejects.toThrow('connection failed');

    expect(client.end).toHaveBeenCalledOnce();
  });

  it('allows the dedicated live-import QA database after checking its real identity', async () => {
    const client = clientFor('gitiempo_qa_live_import_123');

    await expect(
      assertE2eDatabase(
        {
          ...safeEnvironment,
          DATABASE_URL: 'postgresql://localhost/gitiempo_qa_live_import_123',
        },
        () => client,
      ),
    ).resolves.toBe('gitiempo_qa_live_import_123');
  });

  it('stops direct Vitest invocation before test collection for an unsafe database', () => {
    const sentinelDirectory = mkdtempSync(
      join(tmpdir(), 'gitiempo-e2e-guard-'),
    );
    const sentinelPath = join(sentinelDirectory, 'collected');
    try {
      const result = spawnSync(
        process.execPath,
        [
          './node_modules/vitest/vitest.mjs',
          'run',
          '--config',
          './vitest.e2e.config.ts',
          'test/e2e-database-guard-sentinel.e2e-spec.ts',
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://localhost/gi_tiempo',
            E2E_DATABASE_GUARD_SENTINEL_FILE: sentinelPath,
          },
        },
      );

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain(
        'E2E database verification failed',
      );
      expect(existsSync(sentinelPath)).toBe(false);
    } finally {
      rmSync(sentinelDirectory, { recursive: true, force: true });
    }
  });
});
