## Context

GiTiempo already models users and workspace memberships separately, and most backend requests are scoped by the `workspaceId` and `role` claims in the API access token. Login and refresh currently resolve one active membership implicitly, while the web shells expose a counterpart-app link labeled as a workspace action. That is not enough for users who belong to multiple workspaces and need to switch the active workspace after login.

The affected areas span `apps/api` auth/users/workspace services, shared contracts in `packages/shared`, shared browser auth/session helpers and header UI in `packages/web-shared`, and app-local shell/router orchestration in `apps/user-web` and `apps/admin-web`. Backend work follows `apps/api/AGENTS.md`; UI and shared frontend work follows `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/pages-user.md`, `docs/ui/pages-admin.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and `packages/web-shared/AGENTS.md`.

## Goals / Non-Goals

**Goals:**

- Let an authenticated user list every workspace membership they can use.
- Let an authenticated user switch the active workspace after login by receiving a fresh token pair for the selected membership.
- Keep JWT-scoped request authorization unchanged: every protected request still has exactly one active `workspaceId` and role.
- Make profile dropdown and 403 `Switch workspace` actions mean membership switching, while keeping counterpart-app navigation as a separate action.
- Keep shared contracts, OpenAPI, backend validation, frontend clients, and shell UI aligned.

**Non-Goals:**

- No cross-workspace data access in a single request.
- No workspace merge, transfer, or membership invitation changes.
- No new role model and no change to GitHub App user-to-server authorization.
- No browser-side Firebase account switching flow beyond the existing sign-in and invite flows.
- No data migration unless implementation discovers the refresh-token persistence needs an active-workspace column.

## Decisions

### Use Token Reissue For Workspace Switching

`POST /auth/switch-workspace` should validate the caller's current authenticated user, verify that the requested `workspaceId` has an active membership for that user, then issue the normal `{ accessToken, refreshToken, accessTokenExpiresIn }` response for the target membership. The frontend replaces its current token pair with that response and reloads session-scoped data.

Alternative considered: mutate only frontend state while keeping the existing access token. That is rejected because existing guards and services trust JWT `workspaceId` and `role` claims for request scoping.

### Keep Refresh Bound To The Session Workspace

Refresh should continue rotating credentials for the active workspace context represented by the refresh session. If the user loses that membership, refresh is rejected even if the user still belongs to another workspace. A user can recover by signing in again or switching from a still-valid session in another workspace.

Alternative considered: have refresh automatically pick another membership when the original membership is removed. That is rejected because it silently changes authorization context and can put the user in an unexpected workspace.

### Add Current-User Workspace Membership Listing

`GET /users/me/workspaces` should return the authenticated user's available workspace memberships with `workspaceId`, `workspaceName`, `role`, and `isCurrent`. This belongs near the current-user API because it is about the signed-in user's accessible contexts, not admin membership management.

Alternative considered: reuse `/members`, but that endpoint is admin-only and lists members in the current workspace rather than memberships for the current user.

### Keep `/workspace` Current-Context Only

`GET /workspace` remains the active workspace identity endpoint. It must not list alternate memberships or drive the switcher directly. The switcher uses the new current-user membership list, then uses the auth switch endpoint for token replacement.

Alternative considered: expand `/workspace` to include alternates. That is rejected because it mixes current-context identity with user-level membership discovery and would make every workspace identity fetch heavier.

### Keep Shared Header Store-Agnostic

`packages/web-shared` should render the common workspace-switching section and emit/select actions through stable props/events or small shared clients, while app-local auth stores own token replacement, route redirects, and query/cache resets. `user-web` and `admin-web` can share the same membership list contract but keep route policy local.

Alternative considered: move app auth stores or router decisions into `packages/web-shared`. That violates the package boundary described in `packages/web-shared/AGENTS.md`.

### Route After Switch According To App Access

After a successful switch, `user-web` can stay in `user-web` and refresh the current route if the route remains valid. `admin-web` must redirect to `user-web` when the selected membership role cannot access admin routes. A role that can access admin routes should remain in `admin-web` unless the current route is invalid for that role, in which case it should go to the app's default authenticated route.

Alternative considered: always redirect to the same path in the current app. That is rejected because a `member` role can select a valid workspace membership that is not allowed to use admin routes.

## Risks / Trade-offs

- Refresh-token records may not currently store workspace context -> implementation must verify the persisted session model and add the smallest needed persistence change if refresh cannot safely preserve the selected workspace.
- Switching while requests are in flight can mix stale and new workspace responses -> app stores must replace tokens atomically, clear scoped caches, and reload shell/current-user/workspace data after the switch.
- The approved `.pen` screens do not yet include a multi-workspace list state -> implementation should treat docs/specs as source of truth and keep the PrimeVue dropdown/list treatment consistent with existing profile dropdown patterns.
- A 403 page may render before membership options load -> show the action only when another membership is known, and keep `Back to dashboard` available as the primary recovery path.
- Users with many workspaces may outgrow a simple dropdown section -> keep the MVP list compact and keyboard accessible; defer search/filtering until usage requires it.

## Migration Plan

1. Add shared contracts for switch request/response reuse and workspace-membership listing.
2. Add backend membership listing and switch-session behavior with unit/e2e coverage.
3. Update OpenAPI output after backend DTO/controller changes.
4. Add shared frontend clients/session helpers for membership listing and switch token replacement.
5. Update user/admin auth stores, shell dropdowns, and 403 routes to use the switcher and reset scoped data after switching.
6. Verify backend tests, shared contract tests, both frontend auth/session tests, lint/typecheck, and OpenAPI export.

Rollback is a normal code rollback because the planned behavior can be introduced without changing existing request shapes. If a refresh-token workspace-context migration is required, rollback must preserve compatibility with existing single-workspace sessions or invalidate only the newly issued switched sessions.

## Open Questions

- Should login choose the earliest active membership or preserve the most recently selected workspace when no current session exists? The MVP can use a deterministic membership order, but a persistent preference would need a separate product decision.
