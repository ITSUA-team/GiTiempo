import 'dotenv/config';
import { Pool } from 'pg';

export interface GithubRepositoryReferenceCollision {
  externalKeys: string[];
  projectIds: string[];
  referenceIds: string[];
  repositoryKey: string;
  workspaceId: string;
}

export interface GithubRepositoryReferencePreflightSummary {
  collisions: GithubRepositoryReferenceCollision[];
  repositoryReferenceCount: number;
}

/**
 * Read-only deployment check for the case-insensitive GitHub repository
 * identity constraint. It deliberately reports every affected reference and
 * project ID instead of choosing a survivor or moving historical data.
 */
export async function inspectGithubRepositoryReferencePreflight(
  pool: Pick<Pool, 'query'>,
): Promise<GithubRepositoryReferencePreflightSummary> {
  const [counts, collisions] = await Promise.all([
    pool.query<{ repository_reference_count: string }>(`
      SELECT count(*)::text AS repository_reference_count
      FROM project_external_refs
      WHERE provider = 'github' AND external_type = 'repository'
    `),
    pool.query<{
      external_keys: string[];
      project_ids: string[];
      reference_ids: string[];
      repository_key: string;
      workspace_id: string;
    }>(`
      SELECT
        workspace_id::text AS workspace_id,
        lower(external_key) AS repository_key,
        array_agg(id::text ORDER BY id::text) AS reference_ids,
        array_agg(project_id::text ORDER BY id::text) AS project_ids,
        array_agg(external_key ORDER BY id::text) AS external_keys
      FROM project_external_refs
      WHERE provider = 'github' AND external_type = 'repository'
      GROUP BY workspace_id, lower(external_key)
      HAVING count(*) > 1
      ORDER BY workspace_id, repository_key
    `),
  ]);

  return {
    repositoryReferenceCount: Number(
      counts.rows[0]?.repository_reference_count ?? 0,
    ),
    collisions: collisions.rows.map((row) => ({
      workspaceId: row.workspace_id,
      repositoryKey: row.repository_key,
      referenceIds: row.reference_ids,
      projectIds: row.project_ids,
      externalKeys: row.external_keys,
    })),
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const summary = await inspectGithubRepositoryReferencePreflight(pool);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (summary.collisions.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('github-repository-reference-preflight.ts')) {
  void main();
}
