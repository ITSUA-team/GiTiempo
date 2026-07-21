-- Data fix: the browser extension used to lowercase the GitHub org, so the
-- same issue was stored under two casings ("ITSUA-team/repo#5" from the app,
-- "itsua-team/repo#5" from the extension) and became two tasks. The extension
-- no longer lowercases, so new writes agree; this collapses the historical
-- duplicates, keeping the canonically-cased task (the one carrying uppercase
-- letters, i.e. GitHub's real casing) and merging the other's time entries onto
-- it. Casing is NOT normalized away — the canonical key stays.
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
  -- for the same task): keep the canonically-cased one.
  DELETE FROM task_external_refs r
    USING task_external_refs keep
    WHERE r.provider = 'github' AND r.external_type = 'issue'
      AND keep.provider = 'github' AND keep.external_type = 'issue'
      AND r.workspace_id = keep.workspace_id
      AND lower(r.external_key) = lower(keep.external_key)
      AND r.task_id = keep.task_id
      AND (keep.external_key <> lower(keep.external_key)) >= (r.external_key <> lower(r.external_key))
      AND r.id <> keep.id
      AND r.id > keep.id;
END $$;
