# Migration QA — task 9.2

**Date:** 2026-10-13  
**Environment:** disposable PostgreSQL databases on the isolated local cluster at port `55481`. The existing `gitiempo_isolated` frontend fixtures were not read or modified.

## Historical managed data: 0021 → 0022

Created `external_tracking_manual_qa_9_2`, applied migrations `0000` through `0021` in transaction mode, and inserted one controlled historical managed chain:

- workspace `00000000-0000-0000-0000-000000000001` and assigned user `...0101`;
- private project `...0201` with `default_task_billable = false`;
- repository reference `...0221` with key `Customer/Managed-Repo` and `synced_at = 2026-01-05T06:07:08Z`;
- task `...0301` with `default_time_entry_billable = false`, issue reference `...0311`, and `synced_at = 2026-01-09T10:11:12Z`;
- completed extension entry `...0401`, `is_billable = false`, `duration_seconds = 3600`.

Applied `apps/api/drizzle/0022_external_reference_project_policy.sql` with `psql -1 -v ON_ERROR_STOP=1`. It completed successfully. The post-migration query returned:

```text
...0201|managed|private|f|...0101|Customer/Managed-Repo|provider-verified|2026-01-05 08:07:08+02|...0301|f|Customer/Managed-Repo#654|provider-verified|2026-01-09 12:11:12+02|...0401|f|3600
```

This proves existing project/task reference provenance defaults to `provider-verified`, the project defaults to `managed`, and assignment, billing defaults, keys, timestamps, and completed time-entry history remain unchanged. PostgreSQL created the expected case-insensitive repository index (with its physical name truncated by PostgreSQL):

```text
project_external_refs_workspace_provider_repository_key_ci_uniq
... lower((external_key)::text) ... WHERE provider = 'github' AND external_type = 'repository'
```

## External first record

In the same disposable database, inserted a controlled first external record only after 0022:

- project `...0202`: `tracking_mode = external-reference`, `visibility = private`;
- repository and issue references `...0222` / `...0312`: `reference_provenance = user-supplied`, `synced_at = NULL`;
- task `...0302` and running extension entry `...0402`.

The verification query returned:

```text
...0202|external-reference|private|user-supplied|NULL|...0302|user-supplied|NULL|...0402|t
```

This confirms external first-record storage does not invent synchronization timestamps.

## Case-collision preflight and blocked migration

Created a second disposable database, `external_tracking_manual_qa_collision`, through migration `0021`. It contained two distinct historical GitHub repository refs in one workspace:

```text
10000000-0000-0000-0000-000000000221  Customer/Case-Repo
10000000-0000-0000-0000-000000000222  customer/case-repo
```

`DATABASE_URL=... pnpm --filter @gitiempo/api github:repository-reference-preflight` exited `2` and reported the normalized key, both reference IDs, both project IDs, and both original external keys. Applying 0022 then exited `3` at its collision guard with:

```text
Case-insensitive GitHub repository reference collisions found. Run github:repository-reference-preflight and resolve the listed record IDs before applying 0022.
```

After the failed transactional migration, the fixture still contained both reference IDs and its historical time entry `10000000-0000-0000-0000-000000000401`; `projects.tracking_mode` was absent. No project, reference, task, or time-entry deletion or merge occurred.

## Cleanup

Both `external_tracking_manual_qa_9_2` and `external_tracking_manual_qa_collision` are disposable QA databases and are removed after this evidence is recorded. No temporary secrets were written.

## Result

**Pass.** Task 9.2's migration and collision safety checks completed with controlled pre-0022 fixtures. This document records database-only QA evidence; it does not mark implementation tasks complete.
