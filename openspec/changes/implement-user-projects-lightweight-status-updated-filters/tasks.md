## 1. Source And Parity Setup

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `apps/user-web/AGENTS.md` before frontend edits.
- [x] 1.2 Inspect the approved `GITiempo.pen` user Projects screen and record a parity checklist for filter order, labels, control sizing, spacing, desktop layout, and mobile wrapping.
- [x] 1.3 Confirm the implementation scope stays app-local to `apps/user-web` with no backend, shared contract, or admin-style filter changes.

## 2. Filter State And Helpers

- [x] 2.1 Add typed `Status` and `Updated` filter options with required labels: `All statuses`, `Open`, `Closed`, `Any time`, `Today`, `Last 7 days`, and `Older`.
- [x] 2.2 Extend `apps/user-web/src/lib/projects-page-helpers.ts` so grouped project/task filtering applies combined search first, then status and updated predicates, then removes groups with no remaining matching tasks.
- [x] 2.3 Implement browser-local updated bucket matching for `Today`, `Last 7 days`, and `Older` using the same local-time semantics as `formatUpdatedLabel`.
- [x] 2.4 Extend the Projects filter composable so the route exposes selected status/updated values, option suggestions, reset/default behavior, and the combined `filteredProjectGroups` result.

## 3. Projects Page UI

- [x] 3.1 Update `ProjectView.vue` to render the combined search, `Status`, and `Updated` PrimeVue AutoComplete controls in the documented lightweight filter row.
- [x] 3.2 Update the Projects loading skeleton and filtered empty-state copy so they account for all three filters without collapsing request-error state into empty state.
- [x] 3.3 Preserve grouped project sections, page-level `+ New task`, project-level `+ Add task`, existing task mutation/dialog behavior, and frontend-only data loading.
- [x] 3.4 Verify the page does not render source, members, visibility, billable-default, or other admin-style filters.

## 4. Tests

- [x] 4.1 Update `projects-page-helpers` tests for project-name search, task-name search, status filtering, updated filtering, and composed search/status/updated filtering.
- [x] 4.2 Add browser-local date-boundary test coverage for `Today`, `Last 7 days`, and `Older` updated buckets.
- [x] 4.3 Update `ProjectView` tests to assert all three filter controls render with the required labels/options and that filtering narrows rendered task groups as specified.
- [x] 4.4 Add route-level regression coverage that changing filters does not issue new project/task list requests and does not introduce admin-style filter controls.

## 5. Verification

- [x] 5.1 Run `pnpm --filter user-web lint`.
- [x] 5.2 Run `pnpm --filter user-web typecheck`.
- [x] 5.3 Run `pnpm --filter user-web test`.
- [x] 5.4 Perform a final desktop and mobile design parity review against the approved `GITiempo.pen` Projects screen, and document any PrimeVue-only compromise explicitly.
