## 1. Source Alignment

- [x] 1.1 Review `docs/API-ENDPOINTS.md`, `docs/TECHNICAL-REQUIREMENTS.md`, `docs/ui/layout.md`, `docs/ui/pages-user.md`, `docs/ui/pages-admin.md`, and the relevant approved `GITiempo.pen` profile-dropdown screens before implementation.
- [x] 1.2 Decide and document the deterministic initial workspace selection order used when a multi-workspace user logs in without an explicit selected workspace.
- [x] 1.3 Confirm that the existing refresh-token/session persistence model already binds refresh sessions to `workspace_id`, so selected workspace context does not require a schema/migration update for this change.

## 2. Shared Contracts

- [x] 2.1 Add shared auth contract schemas/types for `POST /auth/switch-workspace` using `{ workspaceId }` and the existing token-pair response shape.
- [x] 2.2 Add shared current-user workspace-membership response schemas/types with `workspaceId`, `workspaceName`, `role`, and `isCurrent`.
- [x] 2.3 Add contract tests for valid payloads, unknown-field rejection, role enum validation, and exactly-one-current membership response behavior.

## 3. Backend API

- [x] 3.1 Extend membership lookup logic so it can list all active memberships for a user and resolve a requested target workspace membership.
- [x] 3.2 Implement `GET /users/me/workspaces` for authenticated users and ensure it marks the access-token workspace as current.
- [x] 3.3 Implement `POST /auth/switch-workspace` so it validates target membership and returns a fresh token pair for the selected workspace and role.
- [x] 3.4 Preserve selected workspace context across refresh and reject refresh when the selected membership has been removed.
- [x] 3.5 Keep `GET /workspace` scoped only to the active access-token workspace and ensure it does not return alternate memberships.
- [x] 3.6 Regenerate or update OpenAPI output for the new endpoints and shared contracts.

## 4. Backend Tests

- [x] 4.1 Add auth service/controller tests for successful switch, forbidden target workspace, idempotent current-workspace switch, and refresh after switch.
- [x] 4.2 Add users endpoint tests for listing one workspace, listing multiple workspaces, marking the current workspace, and unauthenticated rejection.
- [x] 4.3 Add e2e coverage proving switched tokens scope `/workspace` and role-protected endpoints to the selected workspace.

## 5. Shared Frontend Session Support

- [x] 5.1 Add shared API clients for current-user workspace membership listing and active-workspace switching.
- [x] 5.2 Extend shared auth/session helpers so a successful switch atomically replaces access and refresh tokens.
- [x] 5.3 Clear workspace-scoped server-state caches after token replacement and reload current user plus workspace identity.
- [x] 5.4 Add shared frontend tests for request paths, payload parsing, token replacement, failure preservation, and cache/session reset behavior.

## 6. User-Web And Admin-Web UI

- [x] 6.1 Update the shared profile dropdown to render a workspace-switching section when multiple memberships are available while keeping counterpart app navigation separate.
- [x] 6.2 Wire `user-web` to switch workspaces from the dropdown and 403 route, then reload or fall back to the user dashboard after a successful switch.
- [x] 6.3 Wire `admin-web` to switch workspaces from the dropdown and 403 route, staying in admin routes only when the selected role can access them.
- [x] 6.4 Ensure `admin-web` redirects to the selected workspace's user dashboard when the selected role cannot access admin routes.
- [x] 6.5 Keep dropdown keyboard navigation, focus return, loading, failure, and single-workspace states accessible and consistent with existing PrimeVue profile-menu behavior.

## 7. Frontend Tests

- [x] 7.1 Add shared header/dropdown tests for multiple memberships, single membership omission, current workspace marker, switch action, counterpart app action, and keyboard navigation.
- [x] 7.2 Add `user-web` auth/store/router tests for successful switch, failed switch preserving current session, 403 switch action, and dashboard fallback.
- [x] 7.3 Add `admin-web` auth/store/router tests for successful admin-role switch, non-admin selected-role redirect to user-web, failed switch preservation, and 403 switch action.

## 8. Verification

- [x] 8.1 Run `pnpm --filter @gitiempo/shared test`.
- [x] 8.2 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- [x] 8.3 Run targeted API e2e tests after required migrate/seed setup when backend switch behavior is implemented.
- [x] 8.4 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [x] 8.5 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`.
- [x] 8.6 Run OpenSpec validation for `add-multi-workspace-active-workspace-switching` and record any validation or PostHog telemetry caveat separately from functional results.
