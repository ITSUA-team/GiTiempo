# Review corrections: findings 1 + 5, 12, 13

14 October 2026. Local working-tree verification; no release, publication, or archival.

## Implemented behavior

- Manual-entry task options use the same user/workspace/project/access-scope query identity as the Projects page. Local options are reusable only while their backing query remains fresh and contains the same authoritative task array. Scope changes during task or GitHub-option requests restart under the current identity. Upserts do not retain invalidated siblings. The unused legacy task-query wrapper was removed.
- `POST /time-entries/timer/capability` validates the existing canonical issue-reference body and returns only permission, access scope, and a safe denial reason. It does not materialize project/task/reference/time-entry records. External preflight makes no provider request; managed preflight preserves installation and assignment checks. Timer start retains its final authorization boundary.
- Popup and injected controls request capability for the current issue and session/workspace, prevent Start without matching permission, offer recovery, and preserve matching owned Stop. Background checks capability again before submitting Start.
- Legacy authority-override tests accept a valid baseline and assert that each injected field appears in the specific `unrecognized_keys` error.

## Executed verification

- Root `pnpm typecheck`, `pnpm lint`, and `pnpm test`: passed. Package tests: 2,568 passed, plus five CI-target detection tests. Lint retains existing warnings in unrelated files.
- Focused API E2E: `external-github-tracking.e2e-spec.ts` and `external-github-tracking-completion.e2e-spec.ts`: 13/13 passed against migrated, seeded, disposable local PostgreSQL. Covers external permission without writes/provider calls, inactive denial, managed installation denial, authorized managed permission, unassigned managed-member denial, removed membership, and existing start/stop isolation.
- Full API E2E, invoked directly with the disposable `DATABASE_URL` in the API process: 29 files and 312/312 tests passed.
- The expanded authorization suite bypasses only test-local rate-limit storage; JWT and membership guards remain active.
- Chrome and Firefox extension builds: passed. Remote manifest-schema validation was skipped because SchemaStore was unreachable.
- OpenAPI export: passed; generated shared artifact includes the capability endpoint and response DTO.
- Independent cache and API/extension reviews: no blocking correctness/security finding. Additional regression tests cover scope changes during GitHub-page loading and stale upserts.
- Strict OpenSpec validation: passed.

## Verification boundaries

The first root-Turbo API E2E invocation produced 255 passed and 56 failed across five seeded-admin suites. Turbo's strict environment filtering did not forward the supplied `DATABASE_URL`; the task could therefore read the local API `.env` database. That invocation was not reliably isolated and may have affected local test/development fixtures. It is not used as verification evidence. The direct isolated rerun passed all 312 tests; no production database was targeted. No application or Turbo configuration was changed to address this separate harness issue.

Approved `GITiempo.pen` references inspected: manual-entry dialog `hjdYE`, top-bar picker `LKDTn`, extension ready `xkeDn`, denied `F5nKsg`, loading `bPI7N`/`E65VJ`, and injected controls `dGk0P`/`Qt8zW`. The dialog markup is unchanged. Extension recovery uses existing issue-card, message, button, and Retry styles; denial keeps context visible and gates Start. Code/state parity was reviewed, but no new native Chrome/Firefox visual/manual matrix was performed for these corrections. Existing section 9 evidence remains a historical QA checkpoint.
