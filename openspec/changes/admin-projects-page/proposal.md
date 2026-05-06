## Why

The admin Projects route (`/projects`) currently renders a placeholder scaffold. Admins and PMs need a functional page to manage project visibility, assign workspace members to projects, and manually create new projects. The API endpoints for project management were delivered in the `add-project-visibility-and-stats-api` change and are ready to consume.

## What Changes

The placeholder `ProjectsView.vue` is replaced with a fully implemented page that matches the approved `.pen` design (node `6iAjf`). Two new service modules are added to `apps/admin-web` for projects and workspace members API calls. A shared `PageHeader` component is extracted to `packages/web-shared` for reuse across admin pages.

## Capabilities

### New Capabilities

- `admin-projects-page`: Full projects list page with stat summary cards, filterable DataTable (by assigned member), inline row expansion for member/visibility editing, and a "New Project" dialog for manual project creation.
- `admin-shared-ui`: Shared `PageHeader` Vue component (title, description, stat cards, CTA slot) usable by both admin and user SPAs.

### Modified Capabilities

<!-- none -->

## Impact

- `apps/admin-web/src/views/ProjectsView.vue` — replaces placeholder
- `apps/admin-web/src/services/projects.ts` — new file
- `apps/admin-web/src/services/members.ts` — new file
- `packages/web-shared/src/components/PageHeader.vue` — new shared component
- `packages/web-shared/src/components/index.ts` — adds PageHeader export
- Existing API endpoints consumed: `GET /projects`, `GET /projects/summary`, `GET /projects/{id}/assignments`, `POST /projects`, `PATCH /projects/{id}`, `POST /projects/{id}/assignments`, `DELETE /projects/{id}/assignments/{assignmentId}`, `GET /workspace/members`
