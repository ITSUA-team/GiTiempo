## 1. Backend Firebase Admin Provisioning

- [ ] 1.1 Extend the `FirebaseAdminService` interface with methods to get/create an invited user by email and generate a password setup/reset link without accepting raw passwords.
- [ ] 1.2 Implement the new methods in the real Firebase Admin provider using `firebase-admin/auth`, including safe error translation and existing app initialization.
- [ ] 1.3 Extend the fake Firebase Admin provider with deterministic user reuse/creation and setup-link behavior for unit and e2e tests.
- [ ] 1.4 Add focused backend tests for new Firebase Admin interface behavior, including existing-user reuse and provisioning/link failures.

## 2. Invite Creation And Delivery

- [ ] 2.1 Update invite creation/delivery orchestration so Firebase provisioning and password setup/reset link generation occur before SMTP or console invite delivery completes.
- [ ] 2.2 Update invite email text and console fallback logging to include invite accept URL plus password setup/reset guidance.
- [ ] 2.3 Preserve existing pending-invite compensation so Firebase provisioning, link generation, or SMTP delivery failure expires the invite and allows retry.
- [ ] 2.4 Add backend invite service/delivery tests for successful provisioning, existing Firebase user reuse, provisioning failure compensation, SMTP content, and console fallback content.

## 3. User Invite Accept Frontend

- [ ] 3.1 Update `InviteAcceptView.vue` to match `docs/ui/pages-user.md` and the approved `Invite Accept` `.pen` screen: email/password sign-in default, no confirm-password field, primary `Accept invite`, password setup guidance, and Google alternative.
- [ ] 3.2 Remove invite-route usage of browser Firebase account creation and map Firebase sign-in/setup errors inline for invalid credentials, missing password setup, too many requests, disabled account, popup cancellation, and email mismatch guidance.
- [ ] 3.3 Keep successful email/password and Google invite flows calling `POST /invites/accept` before normal app API login, then redirecting to the dashboard.
- [ ] 3.4 Update invite accept tests for missing token, email/password success, Google success, sign-in errors, missing password setup guidance, email mismatch retry, terminal invite failures, already-member handling, sign-in-succeeded-but-accept-failed recovery, and URL cleanup.

## 4. Shared Runtime And Contracts

- [ ] 4.1 Remove or de-scope the shared auth runtime account-creation helper from invite onboarding; keep it only if another documented caller still needs it.
- [ ] 4.2 Confirm `POST /invites/accept` request/response contracts remain unchanged; if a resend/setup endpoint is added, update shared Zod contracts and DTOs.
- [ ] 4.3 Regenerate `packages/shared/openapi.json` with the repo-approved workflow only if API shapes change.
- [ ] 4.4 Update or remove tests that mocked invite self-signup so they reflect sign-in-based invite acceptance.

## 5. Verification And Review

- [ ] 5.1 Run API verification: `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [ ] 5.2 Run user-web verification: `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [ ] 5.3 If shared frontend/runtime code changes, run admin-web verification: `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [ ] 5.4 If shared contracts change, run the required shared package build/tests and OpenAPI export workflow.
- [ ] 5.5 Perform final design parity review against `GITiempo.pen` and document any PrimeVue-only compromises.
