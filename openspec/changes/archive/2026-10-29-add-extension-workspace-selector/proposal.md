## Why

The extension currently tracks with its own workspace-scoped session but cannot change that workspace, so a member of multiple workspaces cannot choose where new time entries go. [Issue #455](https://github.com/ITSUA-team/GiTiempo/issues/455) requests an explicit selection in the extension; the approved `GITiempo.pen` account menu now places it above Open profile.

## What Changes

- Add a Workspace selector to the signed-in account dropdown above Open profile, showing the current workspace and the member's available workspaces.
- Reuse membership listing and workspace-switch endpoints to rotate and persist the extension's own session, then refresh popup and injected-control state before enabling tracking.
- Handle loading, a single membership, switch failures, revoked membership, concurrent refresh/switch/sign-out, and stale tracking actions explicitly.
- Preserve the user's global running timer across switches; switching never stops or moves a time entry. New timers use the selected workspace.
- Require implementation parity with the approved `.pen` popup frames, documentation updates, automated regression coverage, and recorded manual browser testing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chrome-extension`: Extend the account menu and define extension-local workspace selection, session transitions, and tracking behavior across workspace changes.

## Impact

- **Frontend:** `apps/chrome-ext` API/session client, background runtime messages and snapshots, popup menu, injected-control invalidation, and associated tests. Follow `apps/chrome-ext/AGENTS.md`.
- **Backend/shared:** Reuse `GET /users/me/workspaces`, `POST /auth/switch-workspace`, and existing shared schemas. No new endpoint, database migration, contract shape, or dependency is planned.
- **Authentication:** The extension gains an explicit workspace-switch flow using existing token rotation semantics. Its session remains independent of the user/admin web apps; no cross-client synchronization or new login default is introduced.
- **Documentation/design:** Update `docs/ui/chrome-ext.md` and extension-specific guidance in `docs/TECHNICAL-REQUIREMENTS.md`; verify the existing endpoint documentation remains accurate. Compare the implementation with `GITiempo.pen` and retain parity/manual-test evidence in this change.
- **Specification conflict:** This change intentionally supersedes the main extension spec's two-action-only account-menu restriction and the switcher non-goal in the completed `external-github-extension-tracking` change. Historical change artifacts remain intact; the canonical spec is updated through the normal sync/archive workflow after implementation.
