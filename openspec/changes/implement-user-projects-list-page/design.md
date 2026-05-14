## Context

The user-web Projects navigation currently targets `projects/:projectId` with a hard-coded `workspace-alpha` parameter and renders `ProjectView.vue` as a placeholder. The approved UI sources instead define a user Projects list page: `docs/ui/pages-user.md` describes grouped visible projects with task rows, `docs/ui/patterns.md` defines the combined projects/tasks search, and `GITiempo.pen` contains the `Projects List` and `Task Dialog` frames.

The backend already exposes the supporting endpoints needed by this page: `GET /projects`, `GET /projects/:id/tasks`, `POST /projects/:id/tasks`, `PATCH /tasks/:id`, and `DELETE /tasks/:id`. The frontend service used by Time Entries and the top-bar timer already owns visible project/task fetches and task creation, but it does not yet expose task update/delete methods needed by the Projects page.

Affected instructions:
- Root `AGENTS.md`: use docs and approved `.pen` as frontend source of truth; verify conflicts before implementation.
- `apps/user-web/AGENTS.md`: use PrimeVue controls, inspect UI docs and approved `.pen`, keep route pages app-local, and match desktop design.

## Goals / Non-Goals

**Goals:**
- Ship an authenticated user-web Projects list page that matches the approved desktop design and documented behavior.
- Use a route model that makes Projects navigation open the list page without a placeholder project id.
- Load visible projects, then load active tasks for those projects and group task rows by project.
- Implement frontend-only combined search across the loaded project/task names.
- Implement true popup task create/update dialogs and delete confirmation with toast/inline error feedback.
- Reuse existing shared contracts and HTTP helper conventions instead of adding new transport primitives.
- Remove the obsolete `projects/:projectId` placeholder route instead of preserving it for future use.

**Non-Goals:**
- Add manual project creation to the user Projects page; docs explicitly limit the page to task management.
- Add external-provider selectors, GitHub sync controls, project assignment management, or admin project settings.
- Build a separate project-detail page beyond preserving or cleanly superseding the current placeholder route.
- Add delete-eligibility metadata such as `canDelete` or `hasTimeEntries` to task responses.
- Change task or project response shapes unless implementation discovers an unavoidable contract gap.

## Decisions

1. **Use `/projects` as the only authenticated user-web Projects route in scope.**
   - Rationale: The approved page is a list of visible projects, not a detail view; navigation should not require a fake `projectId`.
   - Alternative considered: keep `projects/:projectId` and use `workspace-alpha` as a synthetic list id. Rejected because it bakes mock data into routing and conflicts with real project detail semantics.

2. **Keep the Projects page implementation app-local and factor only stable leaves.**
   - Rationale: The page is product-specific to user-web, while shared extraction is only justified for small repeated leaves. The existing Time Entries and top-bar timer code can guide patterns without forcing a broad shared abstraction.
   - Alternative considered: move a generic task-management page or composable into `packages/web-shared`. Rejected because there is not yet a proven cross-app identical call site.

3. **Extend the existing user-web time/task client boundary instead of creating a new overlapping client.**
   - Rationale: `time-entries-client.ts` already owns `GET /projects`, `GET/POST /projects/:id/tasks`, and timer/time-entry interactions. Extending it with `PATCH /tasks/:id` and `DELETE /tasks/:id` avoids duplicate request/error handling.
   - Alternative considered: create a `projects-client.ts`. Rejected unless implementation first extracts a clear task/projects domain boundary without duplicating endpoint ownership.

4. **Load projects first, then tasks per active visible project.**
   - Rationale: The page groups tasks by project and the combined search filters already-loaded frontend data. This matches docs and avoids inventing a backend free-text search endpoint.
   - Alternative considered: add a backend combined projects/tasks endpoint. Rejected because no source requires a new contract and the approved docs explicitly state frontend-visible filtering.

5. **Filter inactive projects out of the user Projects page before task loading.**
   - Rationale: `GET /projects` can return inactive projects for admins, while the approved page is scoped to active task management. Excluding inactive projects from this user-facing page keeps the rendered experience aligned with the docs without changing the backend contract.
   - Alternative considered: render inactive project sections with empty or failed task states. Rejected because the page scope is active task management, not inactive project administration.

6. **Treat task deletion as optimistic only after backend success.**
   - Rationale: Task responses do not include delete eligibility; the backend is authoritative. On `409 Conflict`, the UI must keep the row and surface the backend message.
   - Alternative considered: hide delete buttons for tasks that might have entries. Rejected because the API does not provide reliable eligibility metadata.

7. **Keep the project field display-only in task update mode.**
   - Rationale: The existing `updateTaskSchema` does not support `projectId`, so update mode must not imply task-moving behavior.
   - Alternative considered: add task-moving support to `PATCH /tasks/:id`. Rejected because it expands contract and service scope beyond this change.

## Risks / Trade-offs

- [Risk] Loading tasks per project can produce multiple requests on workspaces with many visible projects. → Mitigation: load active visible projects only, keep request state explicit, and consider future batching only if performance data shows a need.
- [Risk] Removing `projects/:projectId` in favor of `/projects` can affect router tests or any direct links. → Mitigation: update navigation, route inventory specs, and tests together; remove the placeholder route deliberately in the same change.
- [Risk] The existing `time-entries-client` name may become broader than time entries after task update/delete additions. → Mitigation: keep changes minimal for this feature; if naming becomes confusing, perform a focused client rename/extraction within the same bounded task rather than adding a duplicate client.
- [Risk] PrimeVue `DataTable`/`Dialog` structure may differ slightly from static Pencil frames. → Mitigation: use PrimeVue for standard controls and document any PrimeVue-only parity compromise during final review.
- [Risk] The existing task-list endpoint returns more data than the Projects page should show. → Mitigation: keep frontend filtering explicit in one page-state module and cover it with focused tests.

## Migration Plan

1. Update user-web routing/navigation to use `/projects` for the Projects list and remove the placeholder `projects/:projectId` route.
2. Extend the existing client methods and page state, then render the approved UI and dialogs.
3. Keep inactive project/task filtering local to the Projects page state module.
4. Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
5. Rollback strategy: revert the route/navigation/page/client changes as one feature change if needed.

## Resolved Decisions

- Remove `projects/:projectId` from user-web scope in this change rather than reserving it.
- Render the project field as display-only in task update mode.
- The Projects page may still choose eager or progressive project-task loading, but it must preserve distinct loading and request-error states.
