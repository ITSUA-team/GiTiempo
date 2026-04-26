## Context

`apps/api` already ships a real auth/session foundation: Firebase ID token verification, local JWT access tokens, refresh-token rotation, a global `JwtAuthGuard`, and authenticated `/users/me`. What it does not yet ship is the workspace domain that the rest of the MVP assumes: there are no `workspaces`, `workspace_settings`, `workspace_members`, or `invites` tables in the runtime schema, and the current seed only creates users.

That gap creates four product-level failures at once. First, any valid Firebase user can currently log in because membership is not modeled. Second, there is no runtime source of truth for `admin` / `pm` / `member` role enforcement. Third, the documented invite-only onboarding flow does not exist. Fourth, the shared current-user contract cannot expose workspace role even though the API docs already expect it.

This change is backend-led and primarily affects `apps/api` plus `packages/shared`. It should follow the backend app instructions in `apps/api/AGENTS.md`: shared Zod contracts remain the DTO source of truth, Drizzle schemas stay feature-owned and re-exported from `src/db/schema.ts`, and API changes must stay aligned with the documented auth and error-handling conventions already established in the repo.

## Goals / Non-Goals

**Goals:**

- Add the missing backend data model and seeds for `workspaces`, `workspace_settings`, `workspace_members`, and `invites`.
- Make workspace membership the gate for successful login and refresh.
- Add `workspaceId` and `role` to JWT access-token claims for convenient client and server access to session context.
- Add backend endpoints for current workspace, workspace settings, member administration, and invite lifecycle.
- Expand `/users/me` and the shared public user contract to include workspace role.
- Enforce strict invite acceptance rules: only the invited email can accept, invite acceptance creates membership, and users must log in separately afterward.
- Add SMTP-based invite delivery plus an environment-controlled console fallback for development and non-SMTP environments.
- Seed a usable default single-tenant workspace with initial membership state so local development and critical e2e flows are realistic.

**Non-Goals:**

- Frontend implementation in `apps/user-web` or `apps/admin-web`.
- Project-scope authorization (`project_assignments`, PM project guards) beyond workspace-level roles.
- GitHub integration work, invoice/report domain work, or Chrome extension changes.
- Multi-workspace SaaS behavior; this remains a single-tenant MVP with one seeded workspace.
- Returning session tokens from `POST /invites/accept`; the accepted user must log in through the normal auth flow afterward.
- Full email templating or provider abstraction beyond SMTP plus console fallback.

## Decisions

### D1. Module boundaries stay domain-first

- Add three new feature modules in `apps/api`: `WorkspacesModule`, `MembersModule`, and `InvitesModule`.
- Keep `AuthModule` focused on identity/session concerns: Firebase verification, JWT issuing and verification, refresh rotation, and auth guards.
- Keep `UsersModule` focused on user rows and current-user profile behavior.
- Put role-aware request context and authorization guards alongside the membership domain instead of collapsing them into auth.

Why:

- The current backend is already organized by feature module (`auth`, `users`, `commons`, `db`), and the new tables map cleanly to distinct domain areas.
- Membership is the role source of truth, not auth itself, so putting it inside `AuthModule` would create an unstable boundary.

Alternatives considered:

- Put members and invites into `UsersModule`: rejected because membership/invites are workspace-domain concerns, not user-profile concerns.
- Put invite acceptance into `AuthModule`: rejected because acceptance mutates invite state and membership state in addition to identity resolution.

### D2. JWT access tokens carry `workspaceId` and `role`, but DB membership remains authoritative

- Extend access-token claims to include `workspaceId` and `role`.
- Continue to verify real membership from the database on sensitive flows and on session refresh.

Why:

- The user explicitly wants `workspaceId` and `role` available in JWT for convenience.
- Relying only on JWT claims would make role and membership changes stale until token expiry; checking membership in the database preserves correctness when a user is removed or their role changes.

Alternatives considered:

- Keep JWT minimal and load everything from DB on every request: rejected because the chosen direction is to expose workspace context directly in the token.
- Trust JWT claims without DB revalidation: rejected because removed users must lose access immediately on refresh and protected access paths.

### D3. Membership-gated login and refresh both fail as unauthorized

- `POST /auth/login` succeeds only if the verified Firebase identity maps to a local user that already has an active workspace membership.
- `POST /auth/refresh` also fails if the session owner no longer has an active workspace membership.
- Both cases return `401`, not `403`.

Why:

- The product onboarding model is invite-driven; login should not silently create application access for arbitrary Firebase users.
- The user explicitly chose `401` for users without membership.
- Returning `401` keeps the surface aligned with “no valid app session can be issued” rather than “authenticated but forbidden to one route.”

Alternatives considered:

- Return `403` when Firebase identity is valid but membership is missing: rejected per user decision.
- Continue creating local users on login: rejected because it defeats invite-only onboarding.

### D4. Invite acceptance is public, strict, transactional, and returns `204`

- `POST /invites/accept` remains a public endpoint.
- It verifies the invite token, verifies the Firebase identity token, enforces strict email match against the invite email, creates the user if needed, creates the workspace membership, marks the invite accepted, and returns `204 No Content`.

Why:

- The user chose a separate login after acceptance rather than issuing tokens from the accept endpoint.
- Acceptance is a multi-step mutation across invite, user, and membership state, so it must be treated as one transactional workflow.

Alternatives considered:

- Return token pair from `POST /invites/accept`: rejected per final user decision.
- Allow non-matching Firebase email if the token is valid: rejected because it weakens the invite as an email-scoped onboarding mechanism.

### D5. Strict email match is required for invite acceptance

- The accepted Firebase identity email must match the invite email exactly after normalization.

Why:

- This prevents an invite token from becoming a generic bearer credential that can be redeemed by a different Firebase identity.

Alternatives considered:

- Allow any authenticated identity to redeem a valid invite token: rejected for security and auditability reasons.

### D6. `/users/me` becomes role-aware

- Extend the public current-user response to include workspace role.
- Keep internal auth identifiers like `firebaseUid` hidden from the shared public contract.

Why:

- The user selected the contract-expansion path rather than introducing a separate role-only endpoint for current-user context.
- Existing API docs already expect workspace role in the current-user surface.

Alternatives considered:

- Keep `/users/me` unchanged and expose role only via `/workspace`: rejected per user decision.

### D7. The last admin cannot be demoted or removed

- Role-change and member-removal flows must reject any operation that would leave the workspace with zero admins.

Why:

- This is an application invariant in a single-tenant admin-controlled product. Losing the last admin would strand management functions.

Alternatives considered:

- Allow last-admin removal and rely on manual DB recovery: rejected as operationally unsafe.

### D8. Invite delivery uses SMTP with console fallback flag

- Add an invite-delivery abstraction with two runtime modes:
  - SMTP send using configured SMTP environment variables.
  - Console fallback when a dedicated env flag is enabled.

Why:

- The repo already documents SMTP-related variables in `apps/api/.env.example`, but runtime wiring does not exist yet.
- Console fallback keeps local and pre-SMTP environments usable without inventing a second transport.

Alternatives considered:

- Defer delivery entirely and only persist invites: rejected because the user explicitly wants email delivery implemented in this change.
- Return raw invite token in API responses: rejected because invite tokens are one-time onboarding secrets.

### D9. Seeds expand to real single-tenant foundation data

- Replace the current users-only seed baseline with a default workspace, default workspace settings, initial admin user, admin membership, and pragmatic dev seed data for critical local flows.

Why:

- The current seed contradicts the documented MVP shape and does not support realistic role/invite testing.

Alternatives considered:

- Keep only users in seed and create workspace state manually: rejected because it slows feature development and makes e2e setup brittle.

### D10. Test coverage stays focused on critical flows

- Prioritize e2e coverage for login gating, refresh gating, invite acceptance, member admin permissions, and last-admin protection.
- Add targeted unit tests only where business rules are dense or transactional.

Why:

- The user explicitly does not want “tests for tests' sake.”
- The current repo already gets most value from a small set of real e2e flows plus a few focused service tests.

## Planned File Changes

**`apps/api`**

- New feature modules and files under `src/workspaces/*`, `src/members/*`, and `src/invites/*`.
- New Drizzle schema files for `workspaces`, `workspace_settings`, `workspace_members`, and `invites`.
- New or updated guards/decorators for role-aware access context.
- `src/auth/*` updates for JWT payload changes and membership-gated login/refresh.
- `src/users/*` updates for role-aware current-user responses.
- `src/db/schema.ts`, `src/db/seed.ts`, and new SQL migrations under `apps/api/drizzle/*`.
- `src/config/env.validation.ts` and `apps/api/.env.example` updates for invite-delivery configuration.

**`packages/shared`**

- New contracts for workspaces, members, and invites.
- Updated shared user contract with workspace role.
- Downstream OpenAPI snapshot refresh after backend DTO/contract changes.

## Backend / Frontend Coordination

- This change does not implement frontend UI, but it does change the shared contract boundary consumed by both web apps.
- The most visible cross-layer changes are the expanded `/users/me` payload, the new workspace/member/invite contracts, and the new admin-management endpoints that future `admin-web` work will consume.
- Because the apps are not updated here, this change should treat the shared contract layer as the stable handoff point for later frontend work.

## Risks / Trade-offs

- [Risk] JWT claims can become stale after role or membership changes. → Mitigation: keep DB membership checks in refresh and protected authorization paths.
- [Risk] Tightening login to membership-only is a breaking behavior change. → Mitigation: seed the required workspace/admin state and document the new invite-first onboarding path clearly.
- [Risk] Invite acceptance spans invite, user, and membership writes. → Mitigation: implement it in a single transaction.
- [Risk] SMTP configuration can be absent or broken in non-production environments. → Mitigation: support an explicit console fallback mode and validate runtime configuration clearly.
- [Risk] Expanding `/users/me` may require frontend adjustments later. → Mitigation: preserve existing fields and add only the new role field to the public contract.
- [Trade-off] Adding `workspaceId` and `role` to JWT increases token surface slightly. → Accepted because it improves session ergonomics and is explicitly desired.
- [Trade-off] `POST /invites/accept` returning `204` adds one extra login round-trip after acceptance. → Accepted per user decision for a cleaner separation between onboarding and session issuance.

## Migration Plan

1. Add the new Drizzle schemas and generate/apply SQL migrations for workspace-related tables.
2. Update seeds so local and test environments always have the default workspace foundation and initial admin membership.
3. Deploy backend changes with new env validation and invite-delivery wiring.
4. Roll out the login/refresh membership gate together with the seeded workspace data so the system never boots into a “no valid members can log in” state.
5. Refresh shared contracts/OpenAPI after the DTO and response changes land.

Rollback:

- Revert the application code.
- Keep the new tables in place if needed; they are additive and safe to leave during rollback.
- If invite-delivery wiring caused the rollback, disable SMTP usage through env configuration and revert to console fallback or prior binary.

## Open Questions

None. The previously open decisions are now fixed for this change: invite acceptance returns `204`, login without membership returns `401`, email match is strict, JWT includes `workspaceId` and `role`, last-admin demotion/removal is forbidden, and SMTP delivery ships with console fallback.
