## Why

The admin Projects route currently renders a placeholder. Admins need a fully functional projects management page that exposes project stats, a filterable table with inline edit forms and archive/unarchive controls, and a path to create new projects.

## What Changes

- Replace `ProjectsView.vue` placeholder with a complete, pixel-perfect implementation of the Admin Projects screen matching the approved `.pen` design.
- Add a `StatsHeader` component (title, description, stat cards) to `packages/web-shared` for reuse across admin pages.
- Add an admin-local `ProjectsTable` component (PrimeVue DataTable) with inline row expansion for the edit form, visibility badge column, member filter, and archive/unarchive actions.
- Add an admin-local `ProjectEditForm` component embedded in the expandable row (zero padding on the table row sides, PrimeVue controls only).
- Add an admin-local `ProjectStatCard` component for each stat tile (Active Projects, Private, Public) driven by live data from `GET /projects/management-summary`.
- Add a `AddProjectMockView.vue` placeholder route that `New Project` button redirects to (no implementation beyond routing).
- Wire member filter to `GET /workspace-members` to populate a PrimeVue Dropdown.
- Default sort: active projects first, archived (inactive) last.
- Archive: admin-only action calling `PATCH /projects/:id` with `{ isActive: false }`; archived rows show only `Unarchive` action.
- After any edit or archive/unarchive, re-fetch both projects list and management summary to keep header stats live.
- No API contract changes; no typing changes; no new HTTP library usage.

## Capabilities

### New Capabilities

- `admin-projects-page`: Full admin Projects page — stats header, filterable projects table, inline edit form, archive/unarchive flow, and New Project redirect.

### Modified Capabilities

_(none — no spec-level behavior changes)_

## Impact

- `apps/admin-web/src/views/ProjectsView.vue` — replaced.
- `apps/admin-web/src/views/AddProjectMockView.vue` — new placeholder.
- `apps/admin-web/src/router/index.ts` — new route for mock Add Project page.
- `apps/admin-web/src/components/` — new `ProjectsTable`, `ProjectEditForm`, `ProjectStatCard` components.
- `packages/web-shared/src/components/StatsHeader.vue` — new shared component exported via `packages/web-shared/src/index.ts`.
- No backend, contract, or HTTP-layer changes.
