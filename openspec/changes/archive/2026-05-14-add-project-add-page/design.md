## Context

The admin-web app already has a `/projects/new` route (`routeNames.addProject`) pointing at `AddProjectMockView.vue` — a placeholder. The backend exposes `POST /api/workspaces/:id/projects` and `createProjectSchema` in `@gitiempo/shared` covers the required fields (name, visibility). The approved Pencil screen `QjR0g — Add Project` is the pixel-perfect reference.

Current shell: `AdminAppShell.vue` composes `WorkspaceHeader` + `WorkspaceNavigation` + `<RouterView>`. It passes `route.name` directly as `active-name` to `WorkspaceNavigation`, so navigating to `routeNames.addProject` activates nothing (no nav item has that name). The Projects nav item uses `routeNames.projects` as its name.

**Affected layer:** `apps/admin-web` only. No backend changes. No shared contract changes.

## Goals / Non-Goals

**Goals:**
- Replace `AddProjectMockView.vue` with a real implementation (same filename, no router changes needed).
- Render "← Back to projects" link navigating to `routeNames.projects`.
- Build the form: Project name, Source (read-only "Manual"), Project manager (read-only current user), Visibility dropdown.
- Build the Project Source sidebar card with two informational tiles.
- Add `createProject` to `AdminProjectsClient` and wire the form submit.
- Handle loading, error, success, and disabled states consistently with `ProjectsView.vue`.
- Fix Projects nav active state when on the Add Project page by mapping `addProject` → `projects` in `AdminAppShell`.

**Non-Goals:**
- Workspace import functionality (card is informational only).
- Project manager selector (display-only).
- Source selector (display-only, always Manual).
- Color picker (not in the approved form design).
- Mobile/responsive layout beyond the standard shell.

## Decisions

### D1: Keep AddProjectMockView.vue filename

The router already imports `AddProjectMockView`. Replacing its content avoids any router change and keeps the diff minimal.

### D2: Nav active-state fix in AdminAppShell only

Compute `activeName` in `AdminAppShell.vue`: if `route.name === routeNames.addProject`, return `routeNames.projects`; otherwise return `route.name`. This avoids touching `WorkspaceNavigation` in `packages/web-shared`.

**Alternative:** Add an `activeNames: string[]` prop to `WorkspaceNavigation`. Deferred — only one subpage case exists now.

### D3: createProject added to existing admin-projects-client

Extend the existing `AdminProjectsClient` interface and `createAdminProjectsClient` factory with a `createProject(accessToken, body)` method using `requestJson` + `createProjectSchema` + `projectResponseSchema`. No new service file needed.

### D4: PrimeVue components for form fields

| Field | Component |
|---|---|
| Project name | `InputText` (PrimeVue) |
| Source | Read-only styled div (same visual size as inputs) |
| Project manager | Read-only styled div |
| Visibility | `Select` (PrimeVue dropdown) |
| Back link | `RouterLink` / plain `<a>` — brand color, no PrimeVue Button |
| Submit | PrimeVue `Button` (primary) with loading state |
| Cancel/Back | PrimeVue `Button` (secondary/outlined) |

### D5: Workspace ID

`adminProjectsClient` already resolves the workspace from the auth token server-side via the API base URL — `POST /projects` (not `/workspaces/:id/projects`) matches the existing client path convention. If the endpoint requires a workspace-scoped path, use `authStore.workspaceId`.

## Risks / Trade-offs

- **Nav active-state mapping** is a short-term workaround in `AdminAppShell`. A second project subpage will require repeating the same pattern. Mitigation: document with a TODO and add `activeNames` prop to `WorkspaceNavigation` when a second case arrives.
- **Read-only fields** (Source, PM) must visually match real input fields so the layout does not shift when they become interactive. Use the same height, border, padding, and radius.

## Migration Plan

No data migration. Frontend-only change. No rollback needed — removing the code reverts to the placeholder.

## Open Questions

- None blocking.
