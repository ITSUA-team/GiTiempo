# Request and invalidation budget evidence

## Provenance and method

- **Baseline revision:** `4a035c61` (`docs: propose SPA data refresh improvements`).
- **Candidate:** the uncommitted working tree based on `4a035c61`, inspected on
  2026-10-29. This document deliberately does not assign a commit hash to that
  tree.
- **Executed candidate fixtures:**
  - `pnpm --filter user-web exec vitest run src/composables/projects/useProjectsData.spec.ts src/composables/query/index.spec.ts src/lib/query-keys.spec.ts --maxWorkers=1`
    — 3 files, 24 tests passed.
  - `pnpm --filter admin-web exec vitest run src/composables/reports/useReportsData.spec.ts src/composables/reports/useSavedReports.spec.ts src/lib/query-keys.spec.ts --maxWorkers=1`
    — 3 files, 45 tests passed.
- **Scope used by the user fixtures:** a single user/workspace scope, two
  mounted visible project/task inputs (`project-1`/A and `project-2`/B where the
  test needs both), and independently keyed time-entry/timer queries. The
  report fixture uses two visible projects, Orion and Billing; its pagination
  fixture has Orion pages 1 and 2 and Billing page 1.

The candidate counts below are *mock-client call observations*. TanStack Query
may deduplicate overlapping refetch calls, so an invalidated key or scheduled
refetch is not claimed as a completed HTTP request. The later authenticated
Chrome DevTools measurements are recorded separately in
[CDP network evidence](cdp-evidence.md); they distinguish completed browser
requests from these mock observations.

## Reproduction fixture inventory

| Scenario | Active consumers / distinct inputs | Legitimate work counted separately |
| --- | --- | --- |
| Projects A/B | visible-projects plus `projectTasks(A)` and `projectTasks(B)` in the same user/workspace scope | one task-list input per visible project |
| Task edit in A | the A/B fixture above, with a known task whose `projectId` is A | timer current, eligible-last-entry, and A's task-options authority reads are not B task-list reads |
| Timer action in A | running/current timer, time-entry list(s), visible projects, A task list and A timer options | current-timer authority and eligible-last-entry are separate resource inputs |
| Reports return | matching admin/user/workspace/role scope and effective allowed-project signature | each `(projectId, page)` is a distinct report request |
| Preset write | already-loaded preset collection and unchanged report filters | one mutation write is distinct from any collection read |

## Baseline versus candidate budget

| Scenario | Baseline `4a035c61` evidence | Candidate observed/verified budget | Evidence boundary |
| --- | --- | --- | --- |
| Projects focus refresh with fresh A task collection | `useProjectsData` watched every subsequent parent fetch and called `refetch()` for every mounted child task query (`refreshVisibleProjectTasks`, lines 59–78). With A and B mounted it schedules A + B child refetches, even though the parent visibility result is unchanged. | The focused fixture performs 2 visible-project reads total (initial + focus) and **1** A task read total; B is not mounted in that exact fresh-collection fixture. Therefore the new same-key focus wave adds **0** fresh A task reads. | Executed mock count, not browser HTTP. |
| Overlapping manual Projects refreshes | `loadPage()` explicitly refetched all mounted child queries, while the completion watcher could also schedule its all-child wave. This is a duplicate-scheduling path; the exact completed request count is dedup/timing dependent. | Two concurrent `loadPage()` calls produce one additional visible-project read and one additional active task-input read: totals are 2 and 2 including initial load. | Executed mock count. |
| Newly visible B during a manual Projects wave | No per-wave ownership: explicit child loop plus parent completion watcher can target the newly enabled B input. | A starts mounted; after the parent response adds B, B is requested exactly **once** and A exactly **once** for the manual wave. | Executed mock count. |
| Known task edit in A with B mounted | `afterTaskMutation()` invalidated `userProjectsKeys.all(scope)` and `timerKeys.all(scope)` (baseline `query-keys.ts`, lines 141–148), which matches both A and B task collections. It makes B eligible for revalidation. | `afterTaskMutation(scope, A)` matches `projectTasksAll(scope, A)`, current timer, and A task options. The key fixture verifies A invalidates and B stays valid: **0 B task-list invalidations/reads solely from the known edit**. | Candidate assertion observes invalidation state, not a completed network request. |
| Known timer/time-entry action in A with B mounted | `afterTimeEntryMutation()` and `afterTimerMutation()` invalidated the whole projects and timer prefixes (baseline `query-keys.ts`, lines 150–165), matching A and B task/options collections. | Known-source candidate effects target time-entry lists, visible-project metadata, timer current/eligible authority, and A-only task/options keys. B task/options are not matched; broad project/timer prefixes are reserved for a missing previous source. | Candidate key assertions plus timer stale-read cancellation tests; no browser count. |
| Missing-source time-entry update | The broad baseline behavior was already the default. | The uncached-update fixture verifies the conservative current-scope project fallback. This intentionally has no A/B zero-read guarantee because the source is unknown. | Executed invalidation assertion. |
| Fresh Reports remount (two projects, one page each) | `gcTime: 0` in `useReportRowsData` discarded rows on unmount, so a remount requires the two distinct `(project,page=1)` reads again. | Initial load observes **2** reads; remount at 29 s observes **0 additional** reads (still 2 cumulative). | Executed fake-clock mock count. |
| Stale Reports remount (same report fixture) | Baseline has no retained row cache, so it cannot distinguish a fresh return from a stale retained refresh. | At 30,001 ms the retained rows remain and exactly **2** additional reads occur (4 cumulative): one sequence for each distinct project input. | Executed fake-clock mock count. |
| Reports pagination | Each loop intentionally requests every page for every visible project. | Orion page 1, Orion page 2, and Billing page 1 produce exactly **3** reads per refresh. These three inputs are legitimate pagination, not duplicates. | Executed mock count. |
| Explicit Reports refresh after scope shrinks from two projects to Orion | Not measured in baseline; its row query has no effective allowed-project signature. | Exactly **1** Orion read after dependencies settle; the removed Billing input is not requested. | Executed mock count. |
| Preset create/save/rename/delete with an already loaded collection | Each successful write unconditionally called `refresh()` (baseline `useSavedReports.ts`, lines 129, 142, 152, 161): **1 write + 1 immediate `listSavedReports` read**. | Each candidate write test makes the one mutation call and asserts **0 immediate `listSavedReports` calls** beyond the setup's optional initial load. These isolated preset tests have no report-row client; the unchanged-report-input network budget remains a manual acceptance check. | Executed mock call assertions for preset reads only. |

## Static source anchors

- Baseline Projects duplicate owner: `apps/user-web/src/composables/projects/useProjectsData.ts` at `4a035c61`, lines 59–93.
- Baseline broad user mutation keys: `apps/user-web/src/lib/query-keys.ts` at `4a035c61`, lines 141–165.
- Baseline Reports zero retention: `apps/admin-web/src/composables/reports/useReportRowsData.ts` at `4a035c61`, line 117.
- Baseline preset post-write reads: `apps/admin-web/src/composables/reports/useSavedReports.ts` at `4a035c61`, lines 129, 142, 152, and 161.
- Candidate regression fixtures: `apps/user-web/src/composables/projects/useProjectsData.spec.ts`, `apps/user-web/src/lib/query-keys.spec.ts`, `apps/user-web/src/composables/query/index.spec.ts`, `apps/admin-web/src/composables/reports/useReportsData.spec.ts`, and `apps/admin-web/src/composables/reports/useSavedReports.spec.ts`.

## Authenticated browser baseline and comparison status

The completed-request evidence in [CDP network evidence](cdp-evidence.md) uses
headed Chrome for Testing 152 through Chrome DevTools Protocol. The exact
baseline source was served sequentially from
`/private/tmp/spa-refresh-baseline-4a035c61` on the same local origins as the
candidate (`http://localhost:5173` and `http://localhost:5174`). This retained
the normal local browser session without copying or exposing tokens.

The baseline task-A edit and baseline timer start/stop are measured. The
candidate task-A edit is measured after its final cache-reconciliation repair:
it reads A once and reads none of the five unrelated mounted task collections.
The stable candidate timer rechecks are also measured: start reads A once and
none of the five unrelated mounted collections; stop reads A twice and none of
the unrelated collections. The two A stop reads are separately owned by the
Projects collection and the independent authoritative idle-eligibility check.

Reports baseline and candidate measurements now cover fresh and stale returns.
Baseline performs two distinct project/page-1 report reads on both returns.
The candidate performs zero on a fresh return and two required distinct
project/page-1 reads on a stale return while retaining rows. Baseline preset
create/save/rename/delete each made one write plus one saved-report list read;
the candidate's clean write windows contain the write only.

These records do not claim a percentage reduction. Each table separates timer,
visibility, session, project/member, pagination, and mutation requests so that
required authority work is not presented as redundant refresh traffic.

The separate local own-time browser fixture verifies first/last-entry visibility
reconciliation, rather than a request budget; see
[own-time evidence](own-time-evidence.md).
