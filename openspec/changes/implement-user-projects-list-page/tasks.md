## 1. Source Review And Parity Checklist

- [x] 1.1 Read `AGENTS.md`, `apps/user-web/AGENTS.md`, `apps/api/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `docs/ui/components.md` before implementation.
- [x] 1.2 Inspect `GITiempo.pen` frames `Projects List` (`yAu6B`) and `Task Dialog` (`OtPxH`) and build a parity checklist for header, search, project sections, tables, row actions, dialogs, spacing, typography, radii, and states.
- [x] 1.3 Confirm whether `projects/:projectId` should remain as a reserved future detail route or be removed while adding the `/projects` list route.

## 2. Routing And Spec Alignment

- [x] 2.1 Add a `frontend-routing` delta that replaces the placeholder authenticated project-view route with the authenticated `/projects` list route.
- [x] 2.2 Remove the placeholder `projects/:projectId` route from the user-web router and update shell navigation to target `/projects`.
- [x] 2.3 Update router tests to cover `/projects` auth redirect behavior, authenticated route mounting, and the removed placeholder route.

## 3. User-Web Client Boundary

- [x] 3.1 Extend the existing user-web task/projects client boundary with `updateTask(accessToken, taskId, input)` using `updateTaskSchema` and `taskResponseSchema`.
- [x] 3.2 Extend the existing user-web task/projects client boundary with `deleteTask(accessToken, taskId)` using the `204 No Content` endpoint contract and repository error-message parsing.
- [x] 3.3 Add focused client tests for task update payload/response parsing, delete no-content handling, and delete error propagation.

## 4. Projects Page State Module

- [x] 4.1 Build a focused Projects page state module or composable for loading visible projects, filtering inactive projects out of the page, loading project tasks, tracking per-load errors, and retrying failed loads.
- [x] 4.2 Filter visible active projects and active tasks in page state before rendering without relying on backend active-only task responses.
- [x] 4.3 Implement combined frontend search over already-loaded project names and task titles with project-match and task-match behavior from the spec.
- [x] 4.4 Implement dialog state for page-level create, project-level create with preselected project, edit prefill, display-only project field in update mode, validation errors, submit loading, request errors, and reset/close behavior.
- [x] 4.5 Implement delete confirmation state, delete success row removal, and `409 Conflict` handling that keeps the task visible and surfaces the backend message.
- [x] 4.6 Add focused state/composable tests for loading, retry, combined search, create/update success and failure, and delete success/conflict paths.

## 5. Projects Page UI Implementation

- [x] 5.1 Replace the placeholder `ProjectView.vue` with the approved Projects list page structure using PrimeVue controls and token-based Tailwind classes.
- [x] 5.2 Render the page header, copy, primary `+ New task` button, and combined PrimeVue AutoComplete search field matching the approved Pencil frame.
- [x] 5.3 Render grouped project sections with project name, active task count, secondary `+ Add task`, table headers, task rows, status badges, updated metadata, and icon-only edit/delete actions with tooltips and accessible labels.
- [x] 5.4 Render distinct loading, empty, and request-error states without collapsing failed loads into empty-state messaging.
- [x] 5.5 Implement the task create/update PrimeVue Dialog as a true popup with required project select in create mode, display-only project field in update mode, task title input, update status select, Cancel, Create task, and Save changes actions.
- [x] 5.6 Wire PrimeVue confirmation and toast feedback for task delete, create, update, load failures, and mutation failures according to project frontend rules.
- [x] 5.7 Document any PrimeVue-only design compromise found during implementation in the final review notes.

## 6. View Tests

- [x] 6.1 Add focused view/component tests proving header/search rendering, grouped sections, row action accessibility, and distinct loading/empty/error states.
- [x] 6.2 Add focused view/component tests for page-level create, project-level create preselection, edit prefill/save with display-only project field, delete confirmation success, and delete conflict behavior.

## 7. Design Parity And Verification

- [x] 7.1 Perform a final desktop parity pass against `GITiempo.pen` `Projects List` and `Task Dialog` frames and record any remaining deltas.
- [x] 7.2 Run `pnpm --filter user-web lint` and fix all new warnings/errors.
- [x] 7.3 Run `pnpm --filter user-web typecheck` and fix all type errors.
- [x] 7.4 Run `pnpm --filter user-web test` and fix regressions in router, client, composable, and page tests.

## 8. Regression Cleanup

- [x] 8.1 Narrow `useDashboardOverview` to a read-only client dependency for `listOwnEntries` so task update/delete client additions do not force unrelated dashboard specs to mock mutation methods.
- [x] 8.2 Update `useDashboardOverview.spec.ts` to type its client mock against that narrow dependency and rerun `pnpm --filter user-web typecheck`.
