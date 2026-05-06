## 1. Shared Feedback Helpers

- [ ] 1.1 Add a shared frontend feedback module in `packages/web-shared/src` for standard PrimeVue toast and destructive confirmation helpers.
- [ ] 1.2 Implement success toast behavior with the documented success lifetime and shared severity defaults.
- [ ] 1.3 Implement error toast behavior that accepts original errors for diagnostics but renders only safe product-controlled toast detail copy.
- [ ] 1.4 Implement backend-error logging with operation context while avoiding tokens, request bodies, and user-entered secret metadata.
- [ ] 1.5 Implement a destructive confirmation helper that standardizes danger accept props, explicit accept labels, default cancel labeling, and async accept callbacks.
- [ ] 1.6 Export the shared feedback helper surface from `@gitiempo/web-shared` without moving PrimeVue service hosts into shared components.

## 2. Shared Feedback Tests

- [ ] 2.1 Add focused `@gitiempo/web-shared` tests for success toast payloads and default lifetime.
- [ ] 2.2 Add focused tests proving error toasts use safe detail copy and do not render raw backend/API error messages.
- [ ] 2.3 Add focused tests proving backend/API errors are logged with operation context.
- [ ] 2.4 Add focused tests for destructive confirmation defaults and async accept handling.

## 3. User-Web Migration

- [ ] 3.1 Migrate `apps/user-web/src/composables/useTimerPage.ts` from local toast helpers to the shared feedback helpers.
- [ ] 3.2 Preserve timer-page inline scoped error state and active-timer conflict detection while removing raw backend/API messages from toast details.
- [ ] 3.3 Migrate `apps/user-web/src/composables/useProfileGithubConnection.ts` from local toast and destructive confirm wrappers to shared feedback helpers.
- [ ] 3.4 Preserve Profile GitHub callback toast behavior with safe mapped copy for known callback codes and generic safe copy for unknown codes.
- [ ] 3.5 Migrate `apps/user-web/src/views/ProfileView.vue` profile-save toast calls to the shared feedback helpers.
- [ ] 3.6 Keep `<Toast>` and `<ConfirmDialog>` hosts in their existing app/page-level surfaces.

## 4. Optional Feedback Wrapper Review

- [ ] 4.1 Review repeated timer/Profile API outcome feedback calls and identify whether an opt-in shared request feedback wrapper removes boilerplate without hiding feature recovery logic.
- [ ] 4.2 If justified, add an opt-in wrapper that requires explicit safe success/failure copy and does not change low-level `requestJson()` automatic behavior.
- [ ] 4.3 If not justified, document the decision in the implementation summary and keep action-specific shared helper calls local to the composables.

## 5. User-Web Test Updates

- [ ] 5.1 Update timer composable/component tests so error toasts assert safe copy while backend details remain available for logging, inline state, and conflict refresh behavior.
- [ ] 5.2 Update Profile GitHub composable tests for safe error toasts, backend-error logging, callback toast behavior, and shared destructive confirmation usage.
- [ ] 5.3 Update Profile view tests so profile-save failure toasts use safe copy rather than raw backend messages.

## 6. Verification

- [ ] 6.1 Run `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, and the shared package focused tests.
- [ ] 6.2 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and focused user-web tests for affected timer/Profile flows.
- [ ] 6.3 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck` because the shared frontend package export surface changed.
- [ ] 6.4 Confirm no backend, OpenAPI, database, auth, or shared contract changes were introduced.
