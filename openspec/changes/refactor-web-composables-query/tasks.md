## 1. Preparation And Inventory

- [x] 1.1 Re-read `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, `packages/web-shared/AGENTS.md`, `docs/ui/INDEX.md`, and the Vue composable/reactivity references before implementation.
- [x] 1.2 Inspect current TanStack Vue Query v5 docs for plugin setup, QueryClient configuration, reactive query keys, enabled queries, `useMutation`, invalidation, and test-provider patterns.
- [x] 1.3 Inventory every `apps/user-web/src/composables/*.ts` and `apps/admin-web/src/composables/*.ts` file, recording whether it owns server state, local UI state, forms/validation, formatting/derivation, side effects, or route aggregation.
- [x] 1.4 Identify all current consumers of `useTimeEntriesPage`, `useTopBarTimer`, `useProjectsPage`, `useDashboardOverview`, `useAdminDashboardPage`, `useReportsData`, and `useAdminSettingsPage`, including type-only imports from components/specs.
- [x] 1.5 Confirm this change remains frontend-only and does not require `apps/api`, database, seed, migration, OpenAPI, or shared API contract changes.

## 2. TanStack Query Setup

- [x] 2.1 Add `@tanstack/vue-query` to both `apps/user-web` and `apps/admin-web` using pnpm so manifests and lockfile stay consistent with workspace policy.
- [x] 2.2 Install `VueQueryPlugin` in `apps/user-web/src/main.ts` with an app-local QueryClient or queryClientConfig.
- [x] 2.3 Install `VueQueryPlugin` in `apps/admin-web/src/main.ts` with an app-local QueryClient or queryClientConfig.
- [x] 2.4 Add per-app or shared frontend test helpers that mount components/composables with an isolated QueryClient, retries disabled, and cache cleanup between tests.
- [x] 2.5 Add focused bootstrap/test-helper tests proving each SPA can render Query-backed code with an isolated QueryClient.
- [x] 2.6 Configure app QueryClient defaults to preserve current request-error timing (`retry: false`) and immediate staleness (`staleTime: 0`) unless a feature opts into different behavior with tests.

## 3. Shared Query And Utility Boundaries

- [x] 3.1 Add feature-owned query-key factories for user time entries, top-bar timer, user projects, user dashboard, admin dashboard, reports, and admin settings.
- [x] 3.2 Ensure each query key includes non-secret auth/session/workspace scope plus every server-side filter, pagination, date range, sorting, grouping, or prerequisite that affects the backend response, and never includes raw bearer credentials.
- [x] 3.3 Add direct tests for query-key factories and invalidation target helpers.
- [x] 3.4 Extract pure date/time/duration/grouping/row-mapping helpers from large composables into app-local `lib/*` modules or `packages/web-shared` only when behavior is proven identical across both SPAs.
- [x] 3.5 Add direct tests for extracted pure helpers without Vue lifecycle, HTTP, toast, or confirmation dependencies.

## 4. User Time Entries Refactor

- [x] 4.1 Split `useTimeEntriesPage` data loading into a Query-backed `useTimeEntriesData` module that calls the existing time-entry client and preserves request path, auth handling, response parsing, and API error behavior.
- [x] 4.2 Split time-entry filters, pagination, and task lookup query state into focused composables that produce server query params without owning dialogs or mutations.
- [x] 4.3 Split manual time-entry create/edit dialog state, form initialization, validation, and reset behavior into a focused dialog/form composable.
- [x] 4.4 Convert create, update, and delete actions to `useMutation` owners that preserve toast/confirm behavior and invalidate affected time-entry, dashboard, and timer keys.
- [x] 4.5 Move grouping, running-duration display derivation, task option mapping, and date/duration formatting out of the page aggregator into tested pure helpers.
- [x] 4.6 Keep `useTimeEntriesPage` as a thin route aggregator or update `TimeEntriesView.vue` to compose the focused modules directly without reintroducing mixed responsibilities.
- [x] 4.7 Update `useTimeEntriesPage` and `TimeEntriesView` tests to cover loading, empty, request-error, filter changes, pagination, create/edit/delete success, mutation failure, running-entry restrictions, and assembled view behavior.

## 5. User Top-Bar Timer Refactor

- [x] 5.1 Split timer summary and eligible last-task loading into Query-backed data composables with explicit enabled conditions.
- [x] 5.2 Split task-picker project/task data, selected project/task state, and create-task form validation into focused modules.
- [x] 5.3 Convert start timer, stop timer, and create task to `useMutation` owners with targeted invalidation for timer, time entries, dashboard, and projects keys.
- [x] 5.4 Extract elapsed-time ticking and `HH:MM:SS` formatting into a focused composable or pure utility that depends on the reactive clock source actually updated by the timer.
- [x] 5.5 Preserve compact top-bar states, task picker dialog behavior, no-eligible-task handling, conflict refresh behavior, and toast feedback.
- [x] 5.6 Update `useTopBarTimer` and `TopBarTimer` tests for idle/running/no-eligible/error states, picker selection, task creation, start/stop success, start/stop failure, conflict resync, and timer tick rendering.

## 6. User Projects And Dashboard Refactor

- [x] 6.1 Split `useProjectsPage` visible projects/tasks loading into Query-backed data composables that preserve inactive project/task filtering behavior.
- [x] 6.2 Split combined project/task search, grouped section derivation, task dialog form state, and validation into focused modules.
- [x] 6.3 Convert task create, update, and delete actions to `useMutation` owners with targeted invalidation and preserved confirmation/toast/error behavior.
- [x] 6.4 Keep `useProjectsPage` as a thin aggregator or update `ProjectView.vue` to compose the focused modules directly without mixed responsibilities.
- [x] 6.5 Split `useDashboardOverview` into Query-backed own-entry data, weekly focus derivation, recent-entry mapping, and loading/error assembly modules.
- [x] 6.6 Update user Projects and Dashboard composable/view tests for loading, empty, request-error, search behavior, task dialog validation, create/update/delete flows, conflict handling, and dashboard summary/recent-entry states.

## 7. Admin Composable Refactor

- [x] 7.1 Split `useAdminDashboardPage` into Query-backed role-scoped data modules, metric derivation helpers, recent-activity mapping helpers, and a thin dashboard aggregator.
- [x] 7.2 Convert `useReportsData` report loading to Query-backed data ownership while keeping report setup controls separate from table-only discovery filters and CSV export scope.
- [x] 7.3 Convert reports CSV export to a mutation/action owner that preserves current download and toast/error behavior without changing export API scope.
- [x] 7.4 Split `useAdminSettingsPage` into workspace/settings queries, settings form state/validation, dirty-state derivation, and save mutation orchestration while preserving Save/Cancel behavior.
- [x] 7.5 Audit any remaining admin-web composables and split server-state or mixed local-state responsibilities where present.
- [x] 7.6 Update admin dashboard, reports, and settings composable/view tests for query loading, request errors, role scoping, table-only filters, export, save/cancel, mutation invalidation, and toast feedback.

## 8. Cross-App Cleanup And Regression Safety

- [x] 8.1 Remove obsolete manual reload/cache refs and dead helper code from old god-composables after Query-backed modules own server state.
- [x] 8.2 Ensure no query composable directly creates duplicate HTTP transport helpers or bypasses existing domain clients.
- [x] 8.3 Ensure local form/dialog/filter state remains outside Query cache and can be reset independently.
- [x] 8.4 Ensure route-level views remain composition surfaces and do not absorb the old god-composable logic.
- [x] 8.5 Review shared extraction candidates and move only stable identical leaves to `packages/web-shared`; keep app-specific route orchestration local.
- [x] 8.6 Perform a no-visual-regression review against the documented UI/page behavior and note that no `.pen` design changes were required.
- [x] 8.7 Ensure Query cache is cleared or safely scoped on logout, failed bootstrap/session restoration, and successful login to a different session.
- [x] 8.8 Document any inventoried server-state composables intentionally left outside this migration scope, including Profile GitHub connection.

## 9. Verification

- [x] 9.1 Run focused user-web tests for time entries, top-bar timer, projects, dashboard, and Query helper behavior.
- [x] 9.2 Run focused admin-web tests for dashboard, reports, settings, and Query helper behavior.
- [x] 9.3 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 9.4 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck`.
- [x] 9.5 Run `pnpm --filter user-web test` and `pnpm --filter admin-web test`.
- [x] 9.6 If `packages/web-shared` changed, verify both apps still include shared frontend source styling and rerun both app lint/typecheck/test suites after the shared changes.
- [x] 9.7 Run `pnpm exec openspec validate refactor-web-composables-query --strict` and fix validation issues.
