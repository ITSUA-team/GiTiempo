## 1. Source Review And Parity Checklist

- [ ] 1.1 Read `AGENTS.md`, `apps/user-web/AGENTS.md`, `apps/api/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `docs/ui/components.md` before implementation.
- [ ] 1.2 Inspect `GITiempo.pen` frames `Projects List` (`yAu6B`) and `Task Dialog` (`OtPxH`) and build a parity checklist for header, search, project sections, tables, row actions, dialogs, spacing, typography, radii, and states.
- [ ] 1.3 Confirm whether `projects/:projectId` should remain as a reserved future detail route or be removed while adding the `/projects` list route.

## 2. API Task Listing Alignment

- [ ] 2.1 Update `TasksService.listProjectTasks()` so default `GET /projects/:id/tasks` returns active tasks only for visible active projects according to the modified task-management spec.
- [ ] 2.2 Add or update API tests covering active task inclusion, inactive task exclusion, and non-admin inactive-project visibility behavior.
- [ ] 2.3 Run focused API verification for the affected tasks/projects tests and any required API lint/typecheck command.

## 3. User-Web Route And Client Boundary

- [ ] 3.1 Update the user-web route map so the Projects list page is reachable at `/projects` through the authenticated shell.
- [ ] 3.2 Update `AppShell.vue` Projects navigation to target the list route and keep active-state behavior correct.
- [ ] 3.3 Extend the existing user-web task/projects client boundary with `updateTask(accessToken, taskId, input)` using `updateTaskSchema` and `taskResponseSchema`.
- [ ] 3.4 Extend the existing user-web task/projects client boundary with `deleteTask(accessToken, taskId)` using the `204 No Content` endpoint contract and repository error-message parsing.
- [ ] 3.5 Add focused client tests for task update payload/response parsing, delete no-content handling, and delete error propagation.

## 4. Projects Page State Module

- [ ] 4.1 Build a focused Projects page state module or composable for loading visible projects, loading project tasks, tracking per-load errors, and retrying failed loads.
- [ ] 4.2 Filter visible active projects and active tasks consistently with backend responses without relying on inactive task rows for default rendering.
- [ ] 4.3 Implement combined frontend search over already-loaded project names and task titles with project-match and task-match behavior from the spec.
- [ ] 4.4 Implement dialog state for page-level create, project-level create with preselected project, edit prefill, validation errors, submit loading, request errors, and reset/close behavior.
- [ ] 4.5 Implement delete confirmation state, delete success row removal, and `409 Conflict` handling that keeps the task visible and surfaces the backend message.
- [ ] 4.6 Add focused state/composable tests for loading, retry, combined search, create/update success and failure, and delete success/conflict paths.

## 5. Projects Page UI Implementation

- [ ] 5.1 Replace the placeholder `ProjectView.vue` with the approved Projects list page structure using PrimeVue controls and token-based Tailwind classes.
- [ ] 5.2 Render the page header, copy, primary `+ New task` button, and combined PrimeVue AutoComplete search field matching the approved Pencil frame.
- [ ] 5.3 Render grouped project sections with project name, active task count, secondary `+ Add task`, table headers, task rows, status badges, updated metadata, and icon-only edit/delete actions with tooltips and accessible labels.
- [ ] 5.4 Render distinct loading, empty, and request-error states without collapsing failed loads into empty-state messaging.
- [ ] 5.5 Implement the task create/update PrimeVue Dialog as a true popup with required project select, task title input, update status select, Cancel, Create task, and Save changes actions.
- [ ] 5.6 Wire PrimeVue confirmation and toast feedback for task delete, create, update, load failures, and mutation failures according to project frontend rules.
- [ ] 5.7 Document any PrimeVue-only design compromise found during implementation in the final review notes.

## 6. View And Router Tests

- [ ] 6.1 Update router tests to cover `/projects` auth redirect behavior and authenticated route mounting.
- [ ] 6.2 Add focused view/component tests proving header/search rendering, grouped sections, row action accessibility, and distinct loading/empty/error states.
- [ ] 6.3 Add focused view/component tests for page-level create, project-level create preselection, edit prefill/save, delete confirmation success, and delete conflict behavior.

## 7. Design Parity And Verification

- [ ] 7.1 Perform a final desktop parity pass against `GITiempo.pen` `Projects List` and `Task Dialog` frames and record any remaining deltas.
- [ ] 7.2 Run `pnpm --filter user-web lint` and fix all new warnings/errors.
- [ ] 7.3 Run `pnpm --filter user-web typecheck` and fix all type errors.
- [ ] 7.4 Run `pnpm --filter user-web test` and fix regressions in router, client, composable, and page tests.
- [ ] 7.5 Run the affected API verification from section 2 after frontend work remains green.
