## Why

Toast and confirmation behavior is starting to repeat across `user-web` feature surfaces, and the next iteration should be shared before the same feedback patterns drift between the two SPAs. The current specs also require raw API/backend error messages in some toasts, but the desired UX is to show safe user-facing toast copy while preserving backend details for diagnostics and local recovery logic.

## What Changes

- Add shared frontend feedback helpers in `@gitiempo/web-shared` for standard success/error toasts and destructive confirmation prompts.
- Update consuming `user-web` flows to use the shared feedback helpers instead of local `showErrorToast`, `showSuccessToast`, and direct `confirm.require` wrapper logic.
- Establish a safe toast policy: global toast details use product-controlled copy and do not display raw backend/API error messages.
- Preserve backend/API error details for logging, inline feature state where appropriate, and domain-specific recovery logic such as active-timer conflict refreshes.
- Evaluate repeated API feedback calls for an opt-in shared request feedback wrapper, without making the low-level `requestJson()` helper automatically toast every failed request.
- Keep `<Toast>` and `<ConfirmDialog>` hosts page-, shell-, or app-scoped; shared helpers call PrimeVue services but do not render global overlay hosts.
- Avoid backend endpoint, database, OpenAPI, auth semantics, or shared contract shape changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-shared-leaves`: define shared frontend feedback helper ownership, safe toast-message policy, destructive confirmation helper behavior, and the boundary for opt-in API feedback wrappers.
- `user-pages`: update timer and Profile page toast requirements so global toasts no longer expose raw backend/API messages while preserving logging and local recovery behavior.

## Impact

- Affected code: `packages/web-shared/src/*`, `apps/user-web/src/composables/useTimerPage.ts`, `apps/user-web/src/composables/useProfileGithubConnection.ts`, `apps/user-web/src/views/ProfileView.vue`, and related tests.
- Possible follow-up code: `apps/user-web/src/views/LoginView.vue` and `apps/admin-web/src/views/LoginView.vue` may consume shared error normalization if the helper is intentionally exported for non-toast surfaces.
- Verification scope expands to both SPAs because the helper lives in `@gitiempo/web-shared`: `@gitiempo/web-shared`, `user-web`, and `admin-web` lint/typecheck, plus focused tests for affected behavior.
