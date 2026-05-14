## Why

The admin-web app has a placeholder `AddProjectMockView` at `/projects/new` that shows a stub message. The full Add Project design is approved in the Pencil screen and the backend `POST /api/workspaces/:id/projects` endpoint already exists. This change replaces the stub with the real page.

## What Changes

- Replace `AddProjectMockView.vue` with the real Add Project page implementation (keeping the filename — the route already imports it).
- Add a "← Back to projects" navigation link above the page header.
- Build the Add Project form with fields: **Project name** (required text input), **Source** (read-only, always "Manual"), **Project manager** (read-only, shows current user), and **Visibility** (Public / Private dropdown).
- Add an informational **Project Source** sidebar card with two visual option tiles (Manual project — highlighted; Workspace import — default style). No interactivity needed now.
- Add a `createProject` method to `admin-projects-client.ts` and wire the form submit to `POST /projects`.
- Handle all states: loading (submit in progress), success (toast + navigate to projects list), error (inline message), and disabled states during submission.
- Fix the **Projects** navigation item active state so it stays highlighted when on `/projects/new`, by computing an `activeName` in `AdminAppShell.vue`.

## Capabilities

### New Capabilities

- `add-project-page`: Admin Add Project page — real form replacing the placeholder, source card, back navigation, all states, and nav active-state wiring.

### Modified Capabilities

- `admin-pages`: The admin-pages spec gains a new page requirement (Add Project) and a navigation active-state rule for project subpages.

## Impact

- **apps/admin-web**: replace `AddProjectMockView.vue`, extend `admin-projects-client.ts` with `createProject`, fix `AdminAppShell.vue` active-name computation.
- **packages/shared**: No changes — `createProjectSchema` already covers the required fields.
- **apps/api**: No changes — the creation endpoint already exists.
- **No breaking changes.**
