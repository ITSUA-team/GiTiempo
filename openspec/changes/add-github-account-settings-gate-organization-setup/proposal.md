## Why

Workspace admins currently see GitHub organization setup controls without an explicit account-connection prerequisite in Workspace Settings. This makes the setup flow ambiguous when the requesting admin has not connected GitHub, even though organization validation depends on that admin's GitHub account permissions.

## What Changes

- Add a GitHub account section to the admin Workspace Settings GitHub card that shows the requesting admin's current GitHub connection status without exposing token material.
- Gate the `Add organization` workspace policy flow behind an active GitHub connection.
- Hide organization add controls when GitHub is disconnected and show a reconnect/connect path instead.
- Keep existing allowed-organization listing and remove behavior available for workspace policy records that already exist.
- Preserve the existing organization validation and recovery-card behavior after GitHub is connected.
- Ensure loading, empty, disconnected, connected, validation-error, and request-error states remain distinct in the Settings page.
- Record the OpenSpec validation caveat discovered during review: full catalog validation still depends on canonical `user-activity-tracking` and `workspace-membership` purpose metadata being materialized through the normal OpenSpec workflow, not by direct spec edits in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-settings-page`: add Settings page GitHub account connection rendering and disconnected gating behavior for organization setup controls.
- `workspace-github-organization-policy`: clarify that adding organizations from Settings requires the requesting admin to have an active GitHub connection while existing policy reads/removals remain workspace-owned.
- `github-oauth-foundation`: clarify that admin-web may consume connection status to gate Workspace Settings organization setup without exposing token material.

## Impact

- `apps/admin-web`: Settings page GitHub card state, rendering, actions, and tests.
- `packages/shared`: only if current GitHub connection/status contract types need extension or reuse for admin-web consumption.
- `apps/api`: only if the current GitHub connection endpoint is not available to authenticated admin-web requests or needs documented error behavior.
- OpenSpec/UI docs: Settings page requirements and GitHub connection policy requirements.
- OpenSpec validation readiness: targeted validation for this change is expected to pass, while `openspec validate --all` remains dependent on the canonical spec-purpose metadata being handled through the normal workflow.
