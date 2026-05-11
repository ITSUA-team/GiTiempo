## Why

The current user-web implementation still exposes timer tracking as a dedicated route, while the approved UI docs and design move timer control into the authenticated top bar. Moving the timer into global chrome keeps start/stop access available from every member page and aligns timer control with the authenticated shell.

## What Changes

- Add a compact top-bar timer surface to every authenticated `user-web` page, with running, idle, loading, error, and no-eligible-task states matching the approved `.pen` top-bar timer states.
- Add a centered task-picker dialog opened from the compact timer context field, supporting visible Project -> Task selection and creating a new task inside the selected visible project.
- Move timer start/stop behavior out of the dedicated Timer page and into the authenticated shell header.
- **BREAKING** Remove the dedicated `/timer` user-web route and Timer sidebar navigation item.
- Keep manual interval entry out of the top-bar timer and task-picker dialog; Time Entries follow-up work is intentionally out of scope for this change.
- Update stale user-page and routing requirements so the OpenSpec source aligns with `docs/ui/*` and `GITiempo.pen`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: replace dedicated Timer page requirements with global top-bar timer behavior.
- `frontend-routing`: remove `/timer` from authenticated user-web route inventory and shell route expectations.
- `frontend-shared-leaves`: allow shared authenticated header chrome to expose an app-owned center slot/region without moving user-web timer orchestration into `@gitiempo/web-shared`.
- `layout`: require the authenticated user-web top bar center region to host the compact timer while keeping admin-web unaffected.

## Impact

- Affected frontend app: `apps/user-web` shell, router, timer components/composables, and tests.
- Affected shared frontend package: `packages/web-shared` authenticated header component and tests.
- Affected contracts/API usage: existing time-entry, timer, project, and task endpoints are reused; no backend API shape change is planned.
- Affected UI docs/spec alignment: OpenSpec requirements for top-bar timer behavior must be updated to match `docs/ui/pages-user.md`, `docs/ui/layout.md`, `docs/ui/patterns.md`, and the approved `GITiempo.pen` frames `User Topbar Timer States` and `Top-Bar Timer Task Picker`.
