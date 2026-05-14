## Context

The user-web Projects navigation currently targets `projects/:projectId` with a hard-coded `workspace-alpha` parameter and renders `ProjectView.vue` as a placeholder. The approved UI sources instead define a user Projects list page: `docs/ui/pages-user.md` describes grouped visible projects with task rows, `docs/ui/patterns.md` defines the combined projects/tasks search, and `GITiempo.pen` contains the `Projects List` and `Task Dialog` frames.

The backend already exposes most supporting endpoints: `GET /projects`, `GET /projects/:id/tasks`, `POST /projects/:id/tasks`, `PATCH /tasks/:id`, and `DELETE /tasks/:id`. The remaining cross-layer issue is that the documented default task list is active-only, while the current task service returns all tasks for a visible project. The frontend service used by Time Entries and the top-bar timer already owns visible project/task fetches and task creation, but it does not yet expose task update/delete methods needed by the Projects page.

Affected instructions:
- Root `AGENTS.md`: use docs and approved `.pen` as frontend source of truth; verify conflicts before implementation.
- `apps/user-web/AGENTS.md`: use PrimeVue controls, inspect UI docs and approved `.pen`, keep route pages app-local, and match desktop design.
- `apps/api/AGENTS.md`: DTOs wrap shared Zod contracts; API changes require focused tests and OpenAPI awareness.

## Goals / Non-Goals

**Goals:**
- Ship an authenticated user-web Projects list page that matches the approved desktop design and documented behavior.
- Use a route model that makes Projects navigation open the list page without a placeholder project id.
- Load visible projects, then load active tasks for those projects and group task rows by project.
- Implement frontend-only combined search across the loaded project/task names.
- Implement true popup task create/update dialogs and delete confirmation with toast/inline error feedback.
- Reuse existing shared contracts and HTTP helper conventions instead of adding new transport primitives.
- Align backend default project-task listing with active-task documentation.

**Non-Goals:**
- Add manual project creation to the user Projects page; docs explicitly limit the page to task management.
- Add external-provider selectors, GitHub sync controls, project assignment management, or admin project settings.
- Build a separate project-detail page beyond preserving or cleanly superseding the current placeholder route.
- Add delete-eligibility metadata such as `canDelete` or `hasTimeEntries` to task responses.
- Change task or project response shapes unless implementation discovers an unavoidable contract gap.

## Decisions

1. **Use `/projects` as the user Projects list route.**
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

5. **Treat task deletion as optimistic only after backend success.**
   - Rationale: Task responses do not include delete eligibility; the backend is authoritative. On `409 Conflict`, the UI must keep the row and surface the backend message.
   - Alternative considered: hide delete buttons for tasks that might have entries. Rejected because the API does not provide reliable eligibility metadata.

6. **Enforce active-task default in the API service.**
   - Rationale: Docs and endpoint notes say `GET /projects/:id/tasks` lists active tasks by default. Making the backend enforce this keeps all frontend consumers consistent.
   - Alternative considered: filter inactive tasks only in the Projects page. Rejected because it would leave API behavior inconsistent for Time Entries and top-bar timer consumers.

## Risks / Trade-offs

- [Risk] Loading tasks per project can produce multiple requests on workspaces with many visible projects. → Mitigation: load active visible projects only, keep request state explicit, and consider future batching only if performance data shows a need.
- [Risk] Changing the route from `projects/:projectId` to `/projects` can affect router tests or any direct links. → Mitigation: update navigation and tests together; either leave the detail route as a non-nav route or remove it deliberately in the same change.
- [Risk] The existing `time-entries-client` name may become broader than time entries after task update/delete additions. → Mitigation: keep changes minimal for this feature; if naming becomes confusing, perform a focused client rename/extraction within the same bounded task rather than adding a duplicate client.
- [Risk] PrimeVue `DataTable`/`Dialog` structure may differ slightly from static Pencil frames. → Mitigation: use PrimeVue for standard controls and document any PrimeVue-only parity compromise during final review.
- [Risk] API active-task filtering could reveal tests that relied on inactive tasks being returned. → Mitigation: update tests to assert documented default behavior; add explicit future query support only through a separate proposal if inactive task listing becomes required.

## Migration Plan

1. Update API task-list behavior and tests before or alongside the frontend page so frontend consumers receive active-only tasks.
2. Update user-web routing/navigation to use `/projects` for the Projects list.
3. Implement client methods and page state, then render the approved UI and dialogs.
4. Run focused API and user-web tests, plus user-web lint/typecheck.
5. Rollback strategy: revert the route/navigation/page/client changes and API task-list filter change as one feature change if needed.

## Open Questions

- Should `projects/:projectId` remain as a reserved future project-detail route after `/projects` is added, or should it be removed until a detail page is proposed?
- Should the Projects page load tasks for all visible projects immediately, or progressively render project sections while task requests settle? The implementation should choose the smallest approach that still preserves distinct loading/error states.
