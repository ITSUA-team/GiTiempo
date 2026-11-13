# Admin Reports evidence

## Before implementation

- Revision: `4a035c61`.
- Automated baseline: `pnpm --filter admin-web test -- --runInBand` completed with 85 files and 823 tests passing. The command also printed the known jsdom canvas warning.
- Report request model: each visible project is fetched separately and every pagination page is required work. Grouping, table search, and table filters operate on the loaded leaf rows.
- Before this change, report rows had `gcTime: 0`; a remount discarded the rows. Preset create, save, rename, and delete each made a write followed by `listSavedReports()`.

## Mocked request observations after implementation

- The two-project fixture performs two report reads on cold load. The fake-clock remount test observes no additional reads at 29 seconds, two reads after 30,001ms, and cache eviction after five inactive minutes; each read represents a distinct visible-project input.
- The explicit refresh test changes the visible set from two projects to one and observes exactly one report read after the dependency wave settles. This replaces the prior two-read overlap caused by the query key changing and the manual row refetch both starting work.
- The scope-change test delays an old-workspace response, then proves that it cannot replace the new workspace rows.
- A fresh report return within 30 seconds reuses its matching report-row cache entry without a remount-only report request.
- A stale matching return performs one project-by-project report refresh sequence while retaining populated rows. Distinct project/page inputs are required work, not duplicates.
- A changed effective visible-project set has a different report-row cache key and cannot render retained rows from the previous set.
- Preset create, save, rename, and delete perform one write and zero immediate preset-list reads when the active report inputs did not change. Created presets are inserted at the front, matching the API's descending `createdAt` list order; updates and renames retain their existing position.

## Automated evidence

- `apps/admin-web/src/lib/query-keys.spec.ts` verifies effective project-scope cache isolation and key order normalization.
- `apps/admin-web/src/composables/reports/useReportsData.spec.ts` uses fake time to verify fresh/stale/expired remount behavior, all required project/page reads and totals, single-wave explicit refresh, changed project scope, late workspace response isolation, and retained rows through failed row or project-metadata refresh/retry. Retained project and member metadata keep a populated, matching-scope report mounted; an initial or scope-changed query still has no matching row data and remains in the request-error/loading state.
- `apps/admin-web/src/composables/reports/useSavedReports.spec.ts` verifies writes update local state, preserve ordering and active/dirty semantics, do not issue immediate collection reads, and leave committed state intact after failures.
- `apps/admin-web/src/components/reports/ReportsTable.spec.ts` already covers retaining desktop and mobile populated rows during refresh loading.

## Authenticated browser acceptance

- A fresh Reports return issued zero `POST /reports/time` calls
  (`candidate-reports-fresh-return-clean`).
- A stale return retained existing rows at desktop and 390px while exactly two
  distinct `(projectId, page=1)` report inputs refreshed
  (`candidate-reports-stale-return-delayed`).
- Failed report refresh retained rows and exposed Retry at both widths; Retry
  restored the two required project/page inputs
  (`candidate-reports-failure-retry`).
- Disposable preset create, save, rename, and delete each made exactly one
  write and no immediate preset/report/project/member reads in the clean write
  window. The remount-contaminated rename trace is excluded in favour of
  `candidate-preset-rename-write-window`.

The exact baseline ran after normal Admin sign-in. Both its fresh (<30 second)
and stale route returns made two distinct project/page-1 report POSTs. Every
baseline preset create, save, rename, and delete made one write plus one saved
report-list read. No authentication behavior was changed.

The User SPA own-time fixture is recorded separately because it validates
visibility reconciliation, not Admin Reports request counts; see
[own-time evidence](own-time-evidence.md).
