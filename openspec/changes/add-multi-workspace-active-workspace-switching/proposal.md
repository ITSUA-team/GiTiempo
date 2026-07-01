## Why

Authenticated users can belong to more than one workspace, but the current session model resolves only one active workspace context and does not expose a way to choose another membership after login. This creates an implementation gap for users who need to move between workspaces without signing out or relying on the existing cross-app link.

## What Changes

- Add an authenticated workspace-membership list so clients can show available workspaces for the current user.
- Add an authenticated active-workspace switch flow that validates the target membership and returns the normal API token pair for the selected workspace context.
- Keep one active workspace per API session; switching reissues credentials instead of mutating existing access-token claims in place.
- Update frontend session handling so both SPAs can switch workspace context, refresh shell data, and route according to the selected workspace role.
- Update the shared profile dropdown and route-level 403 behavior so `Switch workspace` means membership switching, while the existing `User workspace` / `Admin workspace` link remains app-to-app navigation for the active workspace.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `auth`: Add active-workspace switching as a token-issuing authenticated auth flow and preserve membership-gated login/refresh semantics.
- `admin-auth`: Add admin-web session-switch handling through the shared auth session layer while preserving the current session on switch failure.
- `admin-routing`: Clarify how `admin-web` routes recover after a workspace switch changes the selected role.
- `contracts`: Add shared request/response contracts for workspace switching and current-user workspace-membership listing.
- `frontend-auth`: Add frontend session behavior for switching active workspace context and replacing the local token pair.
- `frontend-shared-leaves`: Extend the shared authenticated header boundary so workspace-switching UI stays shared while app auth/router orchestration stays local.
- `layout`: Update the shared profile dropdown and 403 action behavior to distinguish workspace switching from counterpart-app navigation.
- `users`: Add the current-user workspace-membership listing behavior.
- `workspace-management`: Clarify that `/workspace` remains scoped to the active JWT workspace context.
- `workspace-membership`: Define how active workspace membership is selected and validated for multi-workspace users.

## Impact

- Backend auth and user/workspace controllers/services need new membership listing and switch-session behavior.
- Shared Zod contracts and generated OpenAPI output need new schemas and endpoint shapes.
- `user-web`, `admin-web`, and shared frontend auth/session helpers need workspace-switching clients and token replacement handling.
- Shared shell/profile dropdown components need a workspace-switching section while retaining app-specific profile/settings and sign-out actions.
- Tests need backend unit/e2e coverage for membership selection, forbidden switches, refresh behavior, and frontend coverage for dropdown, token replacement, and routing outcomes.
