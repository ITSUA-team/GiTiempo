import 'dotenv/config';
import { Pool } from 'pg';

interface DuplicateOwner {
  githubUserId: string;
  userCount: number;
  userIds: string[];
}

export interface GithubIdentityPreflightSummary {
  activeCandidates: number;
  excludedDisconnectedOrIncomplete: number;
  conflicts: DuplicateOwner[];
  plannedUnlinkUserIds: string[];
}

/**
 * Read-only deployment preview for the global GitHub identity constraint.
 * It reports only internal user IDs, never credentials or provider tokens.
 */
export async function findDuplicateActiveGithubOwners(
  pool: Pick<Pool, 'query'>,
): Promise<DuplicateOwner[]> {
  const result = await pool.query<{
    github_user_id: string;
    user_count: string;
    user_ids: string[];
  }>(`
    SELECT
      github_user_id,
      count(DISTINCT user_id)::text AS user_count,
      array_agg(DISTINCT user_id::text ORDER BY user_id::text) AS user_ids
    FROM github_connections
    WHERE connected = true AND access_token_encrypted IS NOT NULL
    GROUP BY github_user_id
    HAVING count(DISTINCT user_id) > 1
    ORDER BY github_user_id
  `);
  return result.rows.map((row) => ({
    githubUserId: row.github_user_id,
    userCount: Number(row.user_count),
    userIds: row.user_ids,
  }));
}

/** Includes the excluded historical rows so a deploy audit is reviewable. */
export async function inspectGithubIdentityPreflight(
  pool: Pick<Pool, 'query'>,
): Promise<GithubIdentityPreflightSummary> {
  const [counts, conflicts] = await Promise.all([
    pool.query<{ active_candidates: string; excluded: string }>(`
      SELECT
        count(*) FILTER (WHERE connected = true AND access_token_encrypted IS NOT NULL)::text AS active_candidates,
        count(*) FILTER (WHERE NOT (connected = true AND access_token_encrypted IS NOT NULL))::text AS excluded
      FROM github_connections
    `),
    findDuplicateActiveGithubOwners(pool),
  ]);
  const row = counts.rows[0] ?? { active_candidates: '0', excluded: '0' };
  return {
    activeCandidates: Number(row.active_candidates),
    excludedDisconnectedOrIncomplete: Number(row.excluded),
    conflicts,
    plannedUnlinkUserIds: conflicts.length
      ? (
          await pool.query<{ user_id: string }>(
            `SELECT DISTINCT user_id::text AS user_id
             FROM github_connections
             WHERE github_user_id = ANY($1::varchar[])
             ORDER BY user_id`,
            [conflicts.map((conflict) => conflict.githubUserId)],
          )
        ).rows.map((row) => row.user_id)
      : [],
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const summary = await inspectGithubIdentityPreflight(pool);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('github-identity-preflight.ts')) {
  void main();
}
