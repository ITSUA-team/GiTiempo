-- Data fix: the browser extension used to lowercase the GitHub org, so the
-- same issue was stored under two casings ("ITSUA-team/repo#5" from the app,
-- "itsua-team/repo#5" from the extension) and became two tasks. The extension
-- no longer lowercases, so new writes agree; this collapses the historical
-- duplicates, keeping the canonically-cased task (the one carrying uppercase
-- letters, i.e. GitHub's real casing) and merging the other's time entries onto
-- it. Casing is NOT normalized away — the canonical key stays.
--
-- Once deduped, the unique index is rebuilt on lower(external_key) so a
-- concurrent pair of different-cased inserts can never recreate the split:
-- GitHub owner/repo identity ignores casing, and every runtime lookup already
-- compares via lower(). The stored key itself keeps GitHub's real casing.
DO $$
BEGIN
  -- Canonical task per case-insensitive issue key: prefer the ref that carries
  -- GitHub's real casing (has uppercase), then the oldest task.
  CREATE TEMP TABLE _gh_case_dup ON COMMIT DROP AS
  WITH canonical AS (
    SELECT DISTINCT ON (r.workspace_id, r.provider, r.external_type, lower(r.external_key))
      r.workspace_id, r.provider, r.external_type,
      lower(r.external_key) AS lkey, r.task_id AS canonical_task_id
    FROM task_external_refs r
    JOIN tasks t ON t.id = r.task_id
    WHERE r.provider = 'github' AND r.external_type = 'issue'
    ORDER BY r.workspace_id, r.provider, r.external_type, lower(r.external_key),
             (r.external_key <> lower(r.external_key)) DESC,
             t.created_at ASC, r.task_id ASC
  )
  SELECT DISTINCT r.task_id AS dup_task_id, c.canonical_task_id
  FROM task_external_refs r
  JOIN canonical c
    ON c.workspace_id = r.workspace_id AND c.provider = r.provider
   AND c.external_type = r.external_type AND c.lkey = lower(r.external_key)
  WHERE r.provider = 'github' AND r.external_type = 'issue'
    AND r.task_id <> c.canonical_task_id;

  -- Move time entries onto the canonical task.
  UPDATE time_entries te
    SET task_id = m.canonical_task_id
    FROM _gh_case_dup m WHERE te.task_id = m.dup_task_id;

  DELETE FROM task_external_refs WHERE task_id IN (SELECT dup_task_id FROM _gh_case_dup);
  DELETE FROM tasks             WHERE id      IN (SELECT dup_task_id FROM _gh_case_dup);

  -- Same-task alias refs (e.g. org-owner canonicalization created a second row
  -- for the same task): rank the rows of each case-insensitive key and keep
  -- only the first — canonical casing (has uppercase) wins, then the oldest
  -- row. Ranking makes the outcome independent of how the random UUIDs
  -- happened to compare, which the unique index below depends on.
  DELETE FROM task_external_refs r
    USING (
      SELECT id, row_number() OVER (
        PARTITION BY workspace_id, provider, external_type, lower(external_key), task_id
        ORDER BY (external_key <> lower(external_key)) DESC, created_at ASC, id ASC
      ) AS rn
      FROM task_external_refs
      WHERE provider = 'github' AND external_type = 'issue'
    ) ranked
    WHERE r.id = ranked.id AND ranked.rn > 1;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "task_external_refs_workspace_provider_key_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "task_external_refs_workspace_provider_key_unique" ON "task_external_refs" USING btree ("workspace_id","provider","external_type",lower("external_key"));
