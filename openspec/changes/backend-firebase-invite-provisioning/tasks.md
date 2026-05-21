## 1. Backend Firebase Admin Provisioning

- [x] 1.1 Extend the `FirebaseAdminService` interface with methods to get/create an invited user by email and generate a password setup/reset link without accepting raw passwords.
- [x] 1.2 Implement the new methods in the real Firebase Admin provider using `firebase-admin/auth`, including safe error translation and existing app initialization.
- [x] 1.3 Extend the fake Firebase Admin provider with deterministic user reuse/creation and setup-link behavior for unit and e2e tests.
- [x] 1.4 Add focused backend tests for new Firebase Admin interface behavior, including existing-user reuse and provisioning/link failures.

## 2. Invite Creation And Delivery

- [x] 2.1 Update invite creation/delivery orchestration so Firebase provisioning and password setup/reset link generation occur before SMTP or console invite delivery completes.
- [x] 2.2 Update invite email text and console fallback logging to include invite accept URL plus password setup/reset guidance.
- [x] 2.3 Preserve existing pending-invite compensation so Firebase provisioning, link generation, or SMTP delivery failure expires the invite and allows retry.
- [x] 2.4 Add backend invite service/delivery tests for successful provisioning, existing Firebase user reuse, provisioning failure compensation, SMTP content, and console fallback content.

## 3. User Invite Accept Frontend

- [x] 3.1 Update `InviteAcceptView.vue` to match `docs/ui/pages-user.md` and the approved `Invite Accept` `.pen` screen: email/password sign-in default, no confirm-password field, primary `Accept invite`, password setup guidance, and Google alternative.
- [x] 3.2 Remove invite-route usage of browser Firebase account creation and map Firebase sign-in/setup errors inline for invalid credentials, missing password setup, too many requests, disabled account, popup cancellation, and email mismatch guidance.
- [x] 3.3 Keep successful email/password and Google invite flows calling `POST /invites/accept` before normal app API login, then redirecting to the dashboard.
- [x] 3.4 Update invite accept tests for missing token, email/password success, Google success, sign-in errors, missing password setup guidance, email mismatch retry, terminal invite failures, already-member handling, sign-in-succeeded-but-accept-failed recovery, and URL cleanup.

## 4. Shared Runtime And Contracts

- [x] 4.1 Remove or de-scope the shared auth runtime account-creation helper from invite onboarding; keep it only if another documented caller still needs it.
- [x] 4.2 Confirm `POST /invites/accept` request/response contracts remain unchanged; if a resend/setup endpoint is added, update shared Zod contracts and DTOs.
- [x] 4.3 Regenerate `packages/shared/openapi.json` with the repo-approved workflow only if API shapes change.
- [x] 4.4 Update or remove tests that mocked invite self-signup so they reflect sign-in-based invite acceptance.

## 5. App-Hosted Password Setup Update

- [x] 5.1 Update backend Firebase password setup link generation to use Firebase action-code settings that open the User SPA password setup route and preserve invite-token return context.
- [x] 5.2 Update invite delivery text and console fallback logging to identify the app-hosted password setup link and the invite accept return path.
- [x] 5.3 Add focused backend tests for action-code settings, continue URL generation, link-generation failure compensation, and console/SMTP content.
- [x] 5.4 Add the standalone `user-web` invite password setup route and page using Firebase `verifyPasswordResetCode` and `confirmPasswordReset` without sending raw passwords to GiTiempo APIs.
- [x] 5.5 Add password setup page tests for missing action code, invalid/expired code, valid code render, weak password, confirm-password mismatch, success, invite-token preservation, and fallback navigation.
- [x] 5.6 Re-run API and user-web verification after implementation; run admin-web verification only if shared frontend/runtime helpers change.
- [x] 5.7 Perform design parity review against the `Invite Password Setup` `.pen` screen and document any PrimeVue-only compromises.

## 6. Verification And Review

- [x] 6.1 Run API verification: `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [x] 6.2 Run user-web verification: `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [x] 6.3 If shared frontend/runtime code changes, run admin-web verification: `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [x] 6.4 If shared contracts change, run the required shared package build/tests and OpenAPI export workflow.
- [x] 6.5 Perform final design parity review against `GITiempo.pen` and document any PrimeVue-only compromises.
