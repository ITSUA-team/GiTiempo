## Why

GitHub issue #206 and the approved `GITiempo.pen` user-view top bars have moved the remaining member-facing shell chrome to a compact timer pattern, but the current OpenSpec source still preserves header-visible timer actions and user identity text in places. Aligning the specs first keeps the frontend follow-up from implementing against conflicting sources of truth.

## What Changes

- Update authenticated `user-web` top-bar requirements so every shell variant uses the compact two-line timer surface shown in the approved `.pen` user views.
- Move timer Start, Stop, and task-change controls fully into the popup/task-picker flow; the tablet/desktop top bar and mobile strip no longer render separate timer action buttons outside that popup.
- Right-align the compact timer surface toward the avatar/profile side instead of centering or stretching it across the header center region.
- Make the `user-web` top-bar profile trigger avatar-only by removing visible member-name text, while preserving the existing profile dropdown behavior and admin-web identity/scope text.
- Keep timer data, task selection, start/stop, and running-entry reassignment behavior on the existing frontend/API contracts; no backend API shape change is planned.
- Update tests and design-parity checks so dropdown-open and related user-shell variants stay visually consistent with the base user views.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: revise authenticated user-web shell top-bar and mobile-strip requirements for avatar-only identity, avatar-side timer alignment, and popup-owned timer controls.
- `user-pages`: revise global top-bar timer requirements so visible Start/Stop/task-change actions are owned by the task-picker popup rather than the shell chrome.
- `frontend-shared-leaves`: revise shared header requirements so app shells can choose app-specific identity text visibility while preserving shared dropdown and center-slot ownership boundaries.

## Impact

- Affected frontend app: `apps/user-web` shell, top-bar timer component/composables, user-shell variant tests, and visual parity checks.
- Affected shared frontend package: `packages/web-shared` `WorkspaceHeader` props/layout/tests for user-web avatar-only identity and right-biased center content while preserving admin-web identity behavior.
- Affected source of truth: `docs/ui/layout.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, `docs/ui/accessibility.md`, and OpenSpec specs for `layout`, `user-pages`, and `frontend-shared-leaves`.
- API/contracts: existing `time-entries`, current timer, timer start/stop, time-entry update, projects, and tasks contracts are reused. No backend, database, or OpenAPI changes are expected.
- Approved design source: `GITiempo.pen` user page top bars for Dashboard, Time Entries, Profile, Projects, and profile-dropdown-open user-shell variants.
