## Context

The User SPA has approved docs and `.pen` screens for a `Register New Workflow` page and a login-page `Create workspace` entry point. Current implementation support stops at invite-based onboarding: `/auth/login` exchanges an existing Firebase identity for API tokens only when the identity already has active workspace membership, and `/invites/accept` creates membership only for invited users.

This change adds a separate first-workspace-owner path. It must not weaken the existing invite-only model for users joining an existing workspace, and it must not reuse `/auth/login` or `/invites/accept` for owner registration.

Affected guidance:
- Root `AGENTS.md`: cross-package work should inspect the owning app plus `packages/shared`, and frontend work must follow `docs/ui/*` plus approved `.pen`.
- `apps/api/AGENTS.md`: backend/OpenAPI work belongs in `apps/api` with shared contracts and exported OpenAPI.
- `apps/user-web/AGENTS.md`: route pages stay app-local, contract-facing validation belongs in `packages/shared`, and the approved `.pen` screen is the parity checklist.

## Goals / Non-Goals

**Goals:**
- Add a public `POST /auth/register` endpoint for creating the first owner account and workspace.
- Create or reject the registration as one user-visible operation: Firebase identity, local user, workspace, owner membership, and token pair must either complete together or leave no usable partial workspace registration behind.
- Add shared Zod schemas and OpenAPI coverage for registration request, token-pair response, and mapped errors.
- Add User SPA `/register` behavior matching `docs/ui/pages-user.md` and the approved desktop/mobile `.pen` screens.
- Keep `/auth/login` membership-gated and keep invite acceptance as the only path for joining an existing workspace.

**Non-Goals:**
- No public Google sign-up flow for first-owner registration in this change.
- No invite acceptance changes beyond preserving its existing behavior.
- No admin-created workspace provisioning flow.
- No password-strength meter unless separately approved; the approved UI keeps PrimeVue password feedback disabled.
- No multi-workspace account switching or workspace-selection changes.

## Decisions

### D1. Use `POST /auth/register` as the public registration endpoint

Registration is an auth-adjacent flow because it creates an identity and returns the normal API token pair. Keeping it under `/auth` makes rate limiting, public endpoint markers, token response serialization, and auth service ownership explicit.

Alternative considered: `POST /workspaces/register`. Rejected because the endpoint is not just workspace creation; it provisions identity, local user, owner membership, and session credentials.

### D2. Backend owns Firebase user creation for registration

The registration request includes work email, full name, workspace name, password, and owner acknowledgement. The backend validates the payload through shared contracts, creates the Firebase email/password identity with the Admin SDK, creates app persistence rows, and returns the normal token pair. The backend must never log or store the raw password.

Alternative considered: browser Firebase self-signup followed by backend workspace creation. Rejected because existing Firebase onboarding work documents that browser self-signup may be disabled by project policy, and a failed backend follow-up would leave a Firebase identity with no workspace.

### D3. Treat registration as a coordinated external-side-effect workflow

Database writes for local user, workspace, and owner membership should run in one transaction after Firebase identity creation succeeds. If database registration fails after Firebase identity creation, the backend should attempt to delete the newly created Firebase user before returning failure. If Firebase cleanup fails, emit an operational log without exposing secrets and return a service-unavailable registration error.

Alternative considered: allow partial Firebase identities and rely on support cleanup. Rejected because the user would see a failed registration but later be unable to retry with the same email.

### D4. Reuse the existing token-pair response contract

Successful registration returns the same token-pair response shape as login/refresh so the User SPA can enter the normal authenticated session path and redirect to the dashboard.

Alternative considered: return a Firebase custom token and require a client-side Firebase sign-in round-trip before app session creation. Rejected for MVP because it adds an extra async state and error surface without improving the app API session model.

### D5. Keep the register page app-local but the API boundary shared

The route page and route registration belong in `apps/user-web`; the request/response schemas and typed payloads belong in `packages/shared`. The frontend should add a narrow registration client that uses the repo's existing request URL and error-message conventions rather than a route-local ad hoc fetch.

Alternative considered: extend invite client behavior for registration. Rejected because invite acceptance and first-owner registration are separate product flows with different payloads, endpoint semantics, and error mapping.

## Risks / Trade-offs

- [Risk] Raw registration password reaches the API process. -> Mitigation: validate only at the boundary, pass to Firebase Admin SDK, never persist it, and extend sensitive-data redaction to registration payload fields.
- [Risk] Firebase user creation succeeds but database registration fails. -> Mitigation: wrap app persistence in a transaction and attempt Firebase user deletion before returning failure.
- [Risk] A public endpoint can be abused. -> Mitigation: add strict payload validation, per-route throttling, duplicate detection, and generic service-failure responses where detail would leak account state.
- [Risk] Login behavior could accidentally start creating users again. -> Mitigation: keep `/auth/login` specs and tests membership-gated; registration is the only owner-creation path.
- [Risk] Frontend route could ship before backend support. -> Mitigation: implementation tasks must add the shared contract and backend endpoint before exposing the route in the router.

## Migration Plan

1. Add shared registration contracts and tests.
2. Add backend registration endpoint/service behavior, OpenAPI export, and e2e/unit tests.
3. Add User SPA registration client, route, page, login link, and route/view tests.
4. Verify shared contracts, API tests, user-web tests, lint/typecheck, and OpenAPI export.

Rollback: remove or hide the `/register` route and login entry point first, then disable the public registration endpoint if backend rollout fails. Existing login and invite acceptance flows remain unchanged.

## Open Questions

- Should workspace-name uniqueness be global for MVP, or should unavailable-name detection use a normalized slug reserved from display name? The specs require workspace-name-unavailable behavior; implementation must choose the concrete persistence key before coding.
