## Why

The API has workspace membership, roles, invites, and current workspace context, but it still lacks the project and task layer that time tracking, reports, invoices, and the Chrome Extension depend on. This change adds backend-only project, assignment, task, and provider-neutral external-reference foundations so future time-entry and integration work can build on stable domain tables and contracts.

## What Changes

- Add provider-neutral backend persistence for `projects`, `project_assignments`, `tasks`, `project_external_refs`, and `task_external_refs`.
- Add shared Zod contracts and NestJS DTO wrappers for project, project assignment, and task request/response shapes.
- Add project APIs:
  - `GET /projects`: admins see all projects; `pm`/`member` users see assigned active projects only.
  - `POST /projects`: admins and PMs can create projects; PM creators are automatically assigned to their created project.
  - `GET /projects/:id`: admins can read active or inactive projects; `pm`/`member` users can read assigned active projects only.
  - `PATCH /projects/:id`: admins can update any project; PMs can update assigned projects only.
- Add admin-only project assignment APIs for listing, assigning, and removing `pm`/`member` users from projects.
- Add task APIs:
  - `GET /projects/:id/tasks`: any active member with visibility to the project can list tasks.
  - `POST /projects/:id/tasks`: any active member with visibility to an active project can create a provider-neutral task.
  - `GET /tasks/:id`: any active member with visibility to the task's project can read the task.
  - `PATCH /tasks/:id`: any active member with visibility to the task's project can update title, status, or active state.
- Add role/project-scope authorization support so admins have implicit project access while non-admin users require assignment to an active project.
- Update seed data with deterministic projects, assignments, and tasks for local development and e2e coverage.
- Keep GitHub integration data out of core `projects` and `tasks`; provider identity lives in external ref tables and is not exposed in the initial public project/task responses.

## Capabilities

### New Capabilities

- `project-management`: Project CRUD, project visibility, project assignments, and project-scoped authorization behavior.
- `task-management`: Provider-neutral task listing, creation, reading, updating, and task access through project visibility.

### Modified Capabilities

- `data-model`: Adds provider-neutral project/task tables, project assignment tables, external reference tables, indexes, cascades, and seed expectations.
- `contracts`: Adds shared project, project assignment, and task contracts used by backend DTOs and future frontend clients.

## Impact

- Affected backend code: new `apps/api/src/projects/*` and `apps/api/src/tasks/*` feature areas, `src/db/schema.ts`, `src/db/seed.ts`, app module wiring, guards, migrations, and tests.
- Affected shared package: new exports under `packages/shared/src/contracts/*` and downstream OpenAPI snapshot refresh.
- Affected APIs: new `/projects*` and `/tasks*` endpoints, plus project assignment routes under `/projects/:id/assignments`.
- Affected docs/decisions: aligns with `docs/DATA-MODEL.md`, `docs/API-ENDPOINTS.md`, `docs/TECHNICAL-REQUIREMENTS.md`, and ADR 004 for provider-neutral project/task references.
- No frontend implementation is included in this change.
