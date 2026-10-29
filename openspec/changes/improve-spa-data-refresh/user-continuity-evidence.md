# User SPA continuity evidence

## Baseline captured before the implementation

- `useProjectsData` focused test previously proved that a completed visibility focus refresh scheduled a second read for the still-visible task collection: initial project/task input = one task read; one focus refresh = a second task read for the same input.
- `TimeEntriesView` focused test previously expected the list skeleton while a filter change was pending, even though rows had already loaded.

## Automated implementation evidence

- `pnpm --filter user-web exec vitest run src/composables/projects/useProjectsSearch.spec.ts src/composables/projects/useProjectsData.spec.ts src/composables/time-entries/useTimeEntriesData.spec.ts src/views/TimeEntriesView.spec.ts src/views/ProjectView.spec.ts` — PASS: 73 tests.
- `useProjectsData > shares overlapping manual refreshes instead of restarting project or task reads`: one initial read plus one shared manual wave produces exactly two project reads and two task reads, even when `loadPage()` is called twice concurrently.
- `useProjectsData > does not refetch fresh task collections after a visibility focus refresh`: a fresh task input stays at one read while visibility performs its second authoritative read.
- `useProjectsData > removes a project after focus refresh without reporting a stale child-query 404`: removed project task cache is evicted and no stale child read is scheduled.
- `useProjectsData > keeps loaded task content when a later visibility refresh fails`: a failed focus refresh reports its error while retaining the prior task content.
- `TimeEntriesView > keeps populated rows mounted while a filter change updates the list`: replaces the prior repeat-skeleton assertion with populated-content continuity and updating status.
- `TimeEntriesView > retains prior rows and blocks stale row actions while a delayed filter result is pending`: keeps the last committed row mounted, disables pagination and edit while it is a placeholder, then commits the resolved filtered empty state.
- `useTimeEntriesData > keeps the latest A→B→C result and drops pending results from an old scope`: uses deferred requests that ignore cancellation, proves C's total remains after B settles last, and proves a workspace switch clears the old placeholder until the new-scope response commits.
- `useProjectsData > loads a newly visible project task input once during a manual refresh wave`: guards the manual visibility refresh from refetching the task query that was newly enabled by that same project response.
- `useProjectsSearch > removes revoked project and task suggestions without clearing valid selections`: drops suggestions and a selected search item only after its previously visible project/task disappears.
- `useTimeEntriesData > clears delayed entries after an authoritative visibility refresh revokes their project`: resolves the entry response after the project refresh removes its project and asserts that both rows and totals remain cleared.
- `TimeEntriesView > keeps rows, filter focus, and an open dialog through a same-key refresh failure and retry`: keeps the mounted row, focus, and valid edit dialog across a background error and its successful retry.

- Fake-clock Time Entries route remount test: 29 seconds reuses data with zero extra entry reads while visibility revalidates independently; at 30,001ms a stale retained return reads once; after 300,001 inactive ms the cache is empty and the next mount is cold.

## Authenticated browser acceptance evidence

- Projects local search, status, and date filters issued zero requests
  (`candidate-projects-local-filters`).
- A held Projects refresh followed by two simultaneous Retry actions produced
  one projects read and one read for each of the six mounted task inputs. The
  retained group and search term remained visible at 1280px and 390px
  (`candidate-projects-overlapping-retry-final`).
- A fresh Time Entries return produced zero `GET /time-entries?limit=20` reads
  (`candidate-time-entries-fresh-return`), compared with one in the baseline.
- Delayed Time Entries filter transitions retained rows/cards while disabling
  stale actions at both widths; the populated results return after the delay.
  Screenshots are in `evidence/cdp-user-filter-updating-desktop.png` and
  `evidence/cdp-user-filter-updating-mobile.png`.

## Same-key refresh failure acceptance

The final scoped list failure made one failed `GET /time-entries?limit=20`.
At desktop and 390px widths, time-entry groups stayed mounted; the open dialog
kept its unsaved description and focus. The matching screenshots are
`evidence/cdp-time-entries-failure-desktop.png` and
`evidence/cdp-time-entries-failure-mobile.png`. A separate clean Retry trace
held its sole list read for 18 seconds: groups stayed mounted at both widths,
then success restored six rows and the paginator, cleared updating, and removed
Retry. Screenshots: `evidence/cdp-time-entries-retry-desktop.png` and
`evidence/cdp-time-entries-retry-mobile.png`.

## Workspace-switch acceptance

With a source-workspace list request held, the UI switched to the existing
member workspace. Source groups vanished immediately and did not return after
the canceled delayed response was released at mobile width; the destination was
empty. Screenshots: `evidence/cdp-workspace-pending-desktop.png` and
`evidence/cdp-workspace-pending-mobile.png`.

## Own-time first/last-entry acceptance

The live localhost fixture now covers first-entry visibility, last-entry
revocation, and moving the remaining entry to another project through the User
SPA at desktop and mobile widths. The private project/task becomes visible
only with the member's entry, its hidden sibling remains absent, and removing
or moving the last entry removes the old project/task from selectors and
search. See [own-time evidence](own-time-evidence.md) for the fixture boundary,
screenshots, cleanup check, and network-record scope.
