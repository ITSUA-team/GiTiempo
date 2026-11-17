# Proposal

## Why

Users who forget their password currently have no self-service way to recover access. The approved `.pen` Login screens (user and admin) already include a "Forgot?" link, but the running apps do not implement it, and no `sendPasswordResetEmail` path exists anywhere in the codebase. GitHub issue #474 asks for a standard password recovery flow so users can request a reset link from the Login screen and return to a signed-in-capable state without contacting support.

## What Changes

- Add a "Forgot password?" entry point on the shared `AuthSignInForm.vue` (used by both `apps/user-web` and `apps/admin-web` Login screens), placed inline with the password field row per the approved `.pen` treatment.
- Add a self-service **Password Recovery** request page where the user enters their registered email and triggers Firebase `sendPasswordResetEmail` with an in-app `continueUrl` action-code setting. No backend endpoint is added — the Firebase client SDK sends the reset email directly, consistent with the project's "frontend authenticates with Firebase Auth" direction.
- Add an in-app **Reset Password** landing page that consumes Firebase action-code links (`mode=resetPassword&oobCode=...`), validates the code with `verifyPasswordResetCode`, and confirms the new password with `confirmPasswordReset` — mirroring the existing `apps/user-web/src/views/InvitePasswordSetupView.vue` precedent so raw passwords never reach GiTiempo APIs.
- On successful password update, show a success toast via the shared `createAppToast` helper and redirect to the Login page.
- Add public routes for recovery request and reset landing in both `apps/user-web` and `apps/admin-web` routers, plus matching `routeNames` constants.
- Extend `packages/web-shared` with a shared email-only Zod schema, a `requestPasswordReset` auth-runtime helper, and (if extracted) a shared recovery form component used by both SPAs.
- Update `docs/ui/pages-user.md` and `docs/ui/pages-admin.md` Login Page sections (and add Password Recovery / Reset Password sections) so docs, specs, and design stay in sync per the docs rule that login-page actions require coordinated updates.

### Assumptions recorded

- **No backend API for sending the reset link.** Issue #474 mentions "integrate backend API for sending the password reset link", but the project's established auth direction is Firebase client-side auth, and the existing invite password-setup precedent handles Firebase action codes entirely in-app. The standard `sendPasswordResetEmail` client SDK call satisfies the requirement without a new `apps/api` endpoint. If a backend-delivered custom email is later required, the `FirebaseAdminService` extension point (interface + real + fake + tests) is the documented path.
- **App-hosted reset landing page** (not Firebase-hosted) so the issue's "success notification and redirect to Login" behavior is fully in-app, matching the `InvitePasswordSetupView` pattern.
- **Both SPAs get the feature** because they share `AuthSignInForm.vue` and the `.pen` shows "Forgot?" on both Login screens.

## Capabilities

### New Capabilities

- `frontend-password-recovery`: Self-service password recovery flow for the web SPAs — requesting a Firebase reset email from the Login screen, landing on an in-app reset page that confirms the new password via Firebase action codes, and returning the user to Login after success. Owns the recovery flow end-to-end including the "Forgot password?" entry point behavior.

### Modified Capabilities

- `frontend-auth`: Add a requirement that the user-web login page exposes a "Forgot password?" link to the password recovery flow without disturbing login form state (parallels the existing "Login Page Links To Registration" requirement).
- `admin-auth`: Add a requirement that the admin-web login page exposes the same "Forgot password?" link to the password recovery flow, keeping admin login entry behavior aligned with user-web.

## Impact

- **Frontend (user-web, admin-web)**: new public routes (`/auth/forgot-password`, `/auth/reset-password`), new views, new `routeNames` constants, Login views unchanged except the shared form gains the link.
- **Shared (`packages/web-shared`)**: `AuthSignInForm.vue` gains an optional "Forgot password?" link slot/prop; new email-only Zod schema in `validation/auth.ts`; new `requestPasswordReset` helper on the `AuthRuntime` contract (`runtime.ts`); possible shared `AuthForgotPasswordForm` / `AuthResetPasswordForm` components (extraction justified by two SPA call sites).
- **Shared contracts (`packages/shared`)**: no changes — recovery stays Firebase client-side, no new API contract.
- **Backend (`apps/api`)**: no changes.
- **Docs**: `docs/ui/pages-user.md`, `docs/ui/pages-admin.md` updated with Forgot/Recovery/Reset sections; `.pen` already contains the "Forgot?" link treatment (no new screen exists for the recovery/reset pages — design.md records the gap and the approved-visual-treatment fallback).
- **Authentication behavior**: changes user-visible auth entry behavior on both login screens (new secondary action) — flagged per proposal rules.
- **Tests**: user-web and admin-web auth route + form coverage; both SPA test suites must pass per shared-leaf verification rule.