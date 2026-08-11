## 1. Design and requirements prerequisite

- [x] 1.1 Locate or restore the approved GiTiempo Projects and Time Entries `.pen` screens without overwriting the unrelated Kesher frames currently exposed by `GITiempo.pen`
- [x] 1.2 Add Projects desktop-row and mobile-card timer states to the approved design: idle start, running-same-task stop, blocked-by-other-timer, and pending
- [x] 1.3 Record a concrete Projects parity checklist for action placement, size, icon, tooltip/accessibility copy, spacing, task/GitHub-link alignment, status, updated metadata, and responsive structure
- [x] 1.4 Update `docs/ui/pages-user.md` with the specified direct Projects timer behavior and the top-bar stop-first ownership boundary

## 2. Reusable timer action leaf

- [x] 2.1 Lock the existing Time Entries and Dashboard direct-action presentation, loading, disabled-guidance, label, and emit behavior with focused regression tests before refactoring
- [x] 2.2 Generalize or relocate `TimeEntryTimerAction.vue` into a small user-web task timer-action component with explicit action, task title, target/test identity, blocked-guidance, and pending inputs
- [x] 2.3 Migrate Time Entries and Dashboard call sites to the generalized component without changing their entry-backed start/stop behavior
- [x] 2.4 Run the affected Time Entries and Dashboard component tests and resolve any regression introduced by the extraction

## 3. Projects timer orchestration

- [x] 3.1 Add focused composable tests for idle start, matching-task stop, other-task and cross-workspace blocking, pending-state locking, stale `409` start reconciliation, stale stop reconciliation, and request feedback
- [x] 3.2 Implement a Projects-specific direct timer composable using the existing user-scoped current-timer query, start/stop mutations, timer-cache invalidation, and repository toast/error patterns
- [x] 3.3 Ensure a start submits only the selected task id, while a stop refetches and verifies the authoritative task then conditionally stops the expected entry id; every success/failure reconciles shared timer state without reloading or clearing Projects filters
- [x] 3.4 Route blocked and stale-conflict starts to the existing top-bar task-and-timer stop-first dialog instead of duplicating cross-workspace guidance in Projects page content

## 4. Projects row and card integration

- [x] 4.1 Add desktop and mobile component tests for start, stop, blocked, and pending actions beside the task-title block while preserving GitHub link, status, updated metadata, edit-title behavior, and `Add task`
- [x] 4.2 Extend `ProjectsTaskSection.vue` with typed timer state/intent props and emits, rendering the generalized timer action in both desktop-table and mobile-card branches
- [x] 4.3 Wire `ProjectView.vue` to the Projects timer composable and pass authoritative state plus start/stop/open-guidance intents into every visible project section
- [x] 4.4 Add a focused Projects view integration test covering assembled timer-state wiring, mutation feedback, shared timer refresh, and preservation of active filters/task rows after failure

## 5. Verification and parity review

- [x] 5.1 Run the focused Projects, Time Entries, Dashboard, timer-composable, and view integration tests
- [x] 5.2 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`
- [x] 5.3 Compare desktop and mobile implementation with the approved `.pen` checklist and document any remaining delta or PrimeVue-only compromise
- [x] 5.4 Complete the reusable-pattern review, make stop-first guidance explicit for every caller, and preserve test IDs as observational metadata
- [x] 5.5 Add and verify the identity-bound API/shared-contract stop change; no database migration, dependency, `packages/web-config`, or `packages/web-shared` change is required
