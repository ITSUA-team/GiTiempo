## 1. Shared Header Foundation

- [ ] 1.1 Update `packages/web-shared/src/components/WorkspaceHeader.vue` to support an app-owned center region while preserving existing left/right identity behavior.
- [ ] 1.2 Add or update `WorkspaceHeader` tests for default empty center content and populated center content.
- [ ] 1.3 Verify `apps/admin-web` still renders the shared header without compact timer content.

## 2. Timer Client And State Model

- [ ] 2.1 Refactor the current page-oriented timer client into a user-web timer/time-entry client that supports current timer, start, stop, own time-entry list, visible projects, project tasks, and task creation.
- [ ] 2.2 Add fetch-boundary tests for last tracked entry loading, task creation, start/stop requests, response parsing, auth headers, and API error propagation.
- [ ] 2.3 Extract compact timer state into a focused composable that handles current timer refresh, live elapsed time, eligible last-task context resolution, start/stop actions, and toast feedback.
- [ ] 2.4 Add composable tests for running, idle with eligible last task, no eligible task, loading failure, start conflict refresh, stop success/failure, and live elapsed updates.

## 3. Top-Bar Timer UI

- [ ] 3.1 Build the compact top-bar timer component matching `GITiempo.pen` `User Topbar Timer States` for running, idle, disabled/no-eligible-task, loading, and error states.
- [ ] 3.2 Build the centered task-picker dialog matching `GITiempo.pen` `Top-Bar Timer Task Picker` with visible Project -> Task selection and create-task-in-selected-project behavior.
- [ ] 3.3 Add UI tests covering task information clickability, task selection confirmation, task creation selection, disabled start behavior, and start/stop event flow.
- [ ] 3.4 Mount the compact timer in the user-web `AppShell` header center region and keep it out of admin-web.

## 4. Route And Navigation Removal

- [ ] 4.1 Remove the Timer sidebar navigation item from authenticated user-web navigation.
- [ ] 4.2 Remove the dedicated `/timer` route and `routeNames.timer` from user-web routing.
- [ ] 4.3 Delete or retire `TimerView.vue` and page-only timer component code once replacement behavior is covered.
- [ ] 4.4 Update router and shell tests so authenticated user-web routes are dashboard, time entries, project view, and profile.

## 5. Time Entries Page

- [ ] 5.1 Replace the Time Entries placeholder with the documented page header, filters, grouped entry list, pagination, loading, empty, and request-error states.
- [ ] 5.2 Implement the Time Entries `+ New time entry` dialog with project, task, started-at, ended-at, description, and billable controls.
- [ ] 5.3 Add day-level `+ New time entry` actions that open the same dialog with the selected day prefilled.
- [ ] 5.4 Implement edit mode in the same dialog with existing entry values prefilled and completed-entry update behavior.
- [ ] 5.5 Implement delete confirmation for completed entries with list refresh and toast feedback.
- [ ] 5.6 Ensure running entries are visually distinct and are not editable as completed manual intervals.
- [ ] 5.7 Add page/composable tests for filters, manual create success/failure, edit success/failure, delete confirm success/failure, grouped rendering, pagination, and distinct empty/error states.

## 6. Design Parity And Verification

- [ ] 6.1 Review top-bar timer and task-picker UI against `GITiempo.pen` frames `User Topbar Timer States` and `Top-Bar Timer Task Picker`.
- [ ] 6.2 Review Time Entries implementation against `docs/ui/pages-user.md` and `docs/ui/patterns.md`, documenting any PrimeVue-only compromises.
- [ ] 6.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [ ] 6.4 Because `packages/web-shared` changes, run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [ ] 6.5 Run any affected focused tests for `@gitiempo/web-shared` if not covered by the filtered app test commands.
