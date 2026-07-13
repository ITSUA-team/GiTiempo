## Why

When a user has a running timer in one workspace and switches to another workspace, user-web can render the top-bar timer as idle even though the backend still enforces the user's single running timer. This creates a misleading state where starting a new timer in the new workspace fails with a conflict instead of showing the existing running timer and guiding the user through stopping it first.

## What Changes

- Show the authoritative running timer in the user-web global top-bar timer after workspace switching, even when the running entry belongs to a different workspace than the active session workspace.
- Add visible workspace context to the running timer surface and task-picker dialog when the running timer belongs to another workspace.
- Prevent starting a new timer in the active workspace while a cross-workspace timer is running, and present a clear stop-then-start path.
- Allow the user to stop the existing running timer from the current user-web session, then start a new timer in the active workspace after the authoritative state refreshes.
- Preserve the existing invariant that a user can have at most one running timer; no pause/resume behavior or multiple concurrent timers are introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Clarify global top-bar timer behavior after workspace switching, including cross-workspace running timer display, workspace labeling, and stop-then-start guidance.
- `time-tracking-api`: Clarify current/start/stop timer behavior when the user's running timer belongs to a different workspace than the active session workspace.
- `users`: Clarify that workspace switching must not hide or reset the user's authoritative running timer state in frontend session flows.

## Impact

- `apps/user-web` authenticated shell, top-bar timer surface, mobile timer strip, task-picker dialog, workspace switcher flow, and focused tests.
- User-web timer state composables/query keys and active-workspace session refresh handling.
- `apps/api` time-entry current/start/stop behavior only if the current timer endpoint or stop endpoint is currently scoped too narrowly to the active workspace.
- Shared API contracts/OpenAPI only if the current timer response needs workspace identity/display fields for a cross-workspace running entry.
- UI docs in `docs/ui/layout.md`, `docs/ui/pages-user.md`, and `docs/ui/patterns.md` if implementation changes visible copy or state model.
