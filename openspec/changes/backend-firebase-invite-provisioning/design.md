## Context

The current invite flow assumes the User SPA can create Firebase email/password accounts with the Firebase client SDK before calling `POST /invites/accept`. The active Firebase project rejects browser self-signup with `ADMIN_ONLY_OPERATION`, so first-time invited users cannot complete onboarding. The backend already verifies Firebase ID tokens through `apps/api`, creates local users/memberships during invite acceptance, and sends invite emails through SMTP/console fallback.

The implementation spans `apps/api`, `apps/user-web`, `packages/web-shared`, and `packages/shared` only if contract changes are needed. Backend and frontend coordination is required because invite emails, Firebase identity state, the invite accept page, and the existing `POST /invites/accept` membership boundary must agree on the new sign-in-based flow. Follow `apps/api/AGENTS.md` for NestJS/OpenAPI work and `apps/user-web/AGENTS.md` plus `docs/ui/INDEX.md` and `docs/ui/pages-user.md` for the invite accept UI.

## Goals / Non-Goals

**Goals:**

- Keep GiTiempo invite-only while supporting first-time Firebase email/password invitees when browser signup is disabled.
- Provision or reuse invited Firebase users from the backend with Firebase Admin SDK.
- Deliver Firebase password setup/reset guidance without the application receiving or storing raw passwords.
- Keep membership creation in `POST /invites/accept` after the invitee signs in and presents a Firebase ID token.
- Align the User SPA invite accept screen with the approved `Invite Accept` `.pen` design and updated docs.
- Provide focused backend, frontend, shared runtime, and contract tests for the changed behavior.

**Non-Goals:**

- Adding public self-service registration outside invited onboarding.
- Storing passwords, password hashes, or password setup secrets in GiTiempo data stores.
- Replacing Firebase Auth with a custom identity system.
- Creating local workspace membership before the invitee proves control of the Firebase identity by signing in.
- Changing authenticated app session semantics beyond the existing login exchange after invite acceptance.

## Decisions

1. **Provision Firebase identities during invite creation/delivery.**
   - Decision: extend the backend Firebase Admin abstraction to find/create the invited email and generate a Firebase password reset/setup link before delivering the invite email.
   - Rationale: this matches the Firebase admin-only signup policy and keeps identity provisioning server-side.
   - Alternative considered: enable client self-signup in Firebase. Rejected because the project policy currently blocks it and invite-only onboarding should not depend on public browser signup.

2. **Use Firebase password reset/setup links rather than accepting passwords through GiTiempo.**
   - Decision: send the Firebase-hosted setup/reset link in the invite email and never add an API payload containing passwords.
   - Rationale: Firebase remains the password authority and GiTiempo avoids password handling risk.
   - Alternative considered: create a backend endpoint that accepts an initial password and calls Admin SDK. Rejected because it introduces password transit and validation responsibility into GiTiempo.

3. **Keep `POST /invites/accept` as the membership boundary.**
   - Decision: do not create local users or memberships until the invitee signs in and calls `POST /invites/accept` with `{ token, firebaseIdToken }`.
   - Rationale: the existing endpoint already enforces token validity, expiration, strict email match, local user upsert, membership creation, and invite status transition.
   - Alternative considered: create membership at invite creation time. Rejected because the invitee has not yet proven control of the identity and pending invites would become active memberships.

4. **Reuse the existing invite email channel for setup and acceptance guidance.**
   - Decision: include both the invite accept URL and password setup/reset instructions in invite delivery output. Console fallback logs must include enough non-secret URLs for local/manual testing while remaining disabled in production.
   - Rationale: users receive one onboarding message and admins continue using the existing invite action.
   - Alternative considered: add a separate resend password setup endpoint immediately. Deferred unless implementation discovers that invite resend UX is required by the current product scope.

5. **Update the User SPA to sign in only on the invite accept page.**
   - Decision: remove the browser `createUserWithEmailAndPassword` invite path, remove confirm-password UI, preserve email/password and Google sign-in, and map sign-in/setup errors inline.
   - Rationale: the approved docs/design now define sign-in-based acceptance after backend provisioning.
   - Alternative considered: keep create-account UI and show Firebase policy errors. Rejected because it leaves the primary path broken.

## Risks / Trade-offs

- **Firebase user already exists with a different provider or disabled state** → Reuse by email where safe, surface delivery/provisioning errors to the admin, and keep invite persistence compensating on delivery failure.
- **Password setup link expires before invite acceptance** → Email copy explains using the setup link promptly; admins can cancel/recreate or resend if a resend path is added.
- **Invite delivery succeeds but password link generation fails** → Treat provisioning/link generation as part of delivery; expire the pending invite on failure so retry creates a fresh invite.
- **Google sign-in email mismatch** → Existing `POST /invites/accept` strict email match remains authoritative and the frontend keeps the mismatch retry state.
- **Admin SDK behavior differs between production and tests** → Extend the fake Firebase Admin provider with deterministic create/reuse/link generation behavior for unit and e2e tests.
- **OpenAPI export tooling limitation** → If contracts change, follow `apps/api/AGENTS.md` guidance for the build-based OpenAPI regeneration workflow rather than the broken direct `pnpm openapi:export` path.

## Migration Plan

1. Implement backend Firebase Admin methods and tests behind the existing `FIREBASE_ADMIN` abstraction.
2. Update invite creation/delivery so provisioning and password setup/reset link generation happen before SMTP delivery; keep existing delivery-failure compensation.
3. Update User SPA invite accept UI and tests to match the sign-in-only docs and `GITiempo.pen` parity checklist.
4. Remove invite-specific browser account creation usage from shared runtime only if no remaining callers need it; otherwise keep it outside the invite route but do not use it for invited onboarding.
5. Run focused API, user-web, admin-web, shared package tests/typechecks as applicable.
6. Deploy backend before or with frontend so new invite emails contain password setup guidance before users see the sign-in-only page.

Rollback: restore the previous frontend create-account flow only if Firebase self-signup is re-enabled; otherwise rollback should keep sign-in-only UI and fix backend invite delivery/provisioning forward.

## Open Questions

- Should admins get an explicit resend password setup/invite email action in this change, or is cancel/recreate sufficient for MVP?
- Should Firebase password setup links use a configured `continueUrl` back to `/invites/accept?token=<token>`, and does the Firebase project allow that domain today?
