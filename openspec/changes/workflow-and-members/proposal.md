## Why

`apps/api` already has real Firebase-backed JWT authentication, but the product's workspace model is still missing in code. As a result, any verified Firebase user can log in, there is no source of truth for roles or workspace scope, and the documented invite-only onboarding flow does not exist.

## What Changes

- Add backend persistence and seed support for `workspaces`, `workspace_settings`, `workspace_members`, and `invites` so the API matches the MVP data model.
- Implement backend workspace endpoints for reading the current workspace and managing workspace settings.
- Implement backend member-management endpoints for listing members, changing roles, and removing members, including protection against removing or demoting the last admin.
- Implement backend invite endpoints for listing, creating, canceling, and accepting invites.
- Implement invite delivery through SMTP with an environment-controlled console fallback for local and non-SMTP environments.
- **BREAKING**: change `POST /auth/login` so it only succeeds for users who already have a workspace membership.
- **BREAKING**: change `POST /auth/refresh` so it rejects sessions whose user no longer has a workspace membership.
- **BREAKING**: extend JWT access-token claims with `workspaceId` and `role`.
- **BREAKING**: extend `GET /users/me` to include the authenticated user's workspace role.
- Update shared contracts in `packages/shared` for workspaces, members, invites, and the expanded current-user response.

## Capabilities

### New Capabilities
- `workspace-management`: current-workspace and workspace-settings behavior, including the seeded default workspace context used by the single-tenant MVP.
- `workspace-membership`: membership records, role-aware access context, member administration, and last-admin protection.
- `workspace-invites`: invite lifecycle, acceptance rules, and invite-delivery behavior.

### Modified Capabilities
- `auth`: login and refresh now require active workspace membership, and access tokens carry `workspaceId` and `role` claims.
- `users`: current-user responses now include the authenticated user's workspace role.
- `contracts`: shared backend/frontend contracts expand to cover workspace, members, invites, and the new current-user shape.
- `data-model`: the single-tenant seed and observable data-model behavior expand from users-only to include workspace, settings, membership, and invites.

## Impact

- Affected code: `apps/api/src/auth/*`, `apps/api/src/users/*`, new backend modules for workspace, members, invites, and DB schema/seed files under `apps/api/src/db/*` and `apps/api/drizzle/*`.
- Affected APIs: `/auth/login`, `/auth/refresh`, `/users/me`, `/workspace*`, `/members*`, `/invites*`.
- Affected shared package: `packages/shared/src/contracts/*` and downstream OpenAPI export.
- Affected environment/runtime: SMTP-related environment variables plus a new console-fallback flag for invite delivery.
