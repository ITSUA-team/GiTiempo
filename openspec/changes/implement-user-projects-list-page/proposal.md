## Why

The user-web Projects navigation currently opens a placeholder project-detail scaffold, while the approved docs and Pencil design define a grouped Projects list page for managing tasks across visible projects. This change aligns the route, source-of-truth specs, and frontend implementation so users can search visible projects/tasks and create, update, or delete tasks from the approved page.

## What Changes

- Add the user Projects list page as an authenticated user-web route, using the approved `Projects List` Pencil frame and `Task Dialog` reference.
- Replace the current placeholder `ProjectView.vue` with a real grouped visible-project/task management page.
- Update Projects navigation so it opens the list page instead of the hard-coded `/projects/workspace-alpha` placeholder detail path.
- Add a combined PrimeVue `AutoComplete` search over already-loaded visible project and task names.
- Add task create and update flows in a true PrimeVue `Dialog`, including page-level `+ New task`, project-level `+ Add task`, project selection, task title, status editing, validation, loading, success, and error states.
- Add task deletion with the shared confirmation pattern, `204 No Content` success handling, and `409 Conflict` handling that keeps the task rendered and surfaces the backend message.
- Keep the existing backend task-list contract and filter inactive tasks/projects in the Projects page state before rendering.
- Add focused frontend tests for the new route, page state, client methods, task mutations, and search behavior.
- Remove the placeholder `projects/:projectId` user-web route and intentionally supersede it with the documented `/projects` list route.

## Capabilities

### New Capabilities
- `user-projects-list-page`: Authenticated user-web Projects list page behavior, including grouped visible projects, combined frontend search, task create/update/delete dialogs, state handling, and route/navigation expectations.

## Impact

- **apps/user-web**: route map, authenticated shell navigation, `ProjectView.vue`, new or local Projects page composable/components, user-web task client methods, PrimeVue dialog/confirm/toast wiring, and focused Vitest coverage.
- **packages/shared**: likely no contract shape changes; existing project/task Zod contracts already cover visible projects and task create/update responses.
- **Design/docs**: implementation must follow `docs/ui/pages-user.md`, `docs/ui/patterns.md`, `docs/ui/components.md`, and `GITiempo.pen` frames `Projects List` and `Task Dialog`.
- **OpenSpec**: update `frontend-routing` and the new `user-projects-list-page` capability together so route inventory and page behavior remain internally consistent.
