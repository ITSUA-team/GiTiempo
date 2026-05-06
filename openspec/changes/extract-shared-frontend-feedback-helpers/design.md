## Context

`apps/user-web` currently has repeated toast helper code in timer and Profile GitHub composables, plus inline toast calls in the Profile identity form. Profile GitHub disconnect also wraps `confirm.require()` locally. The same PrimeVue services are installed in both SPAs, and shared frontend leaf ownership already lives in `@gitiempo/web-shared`.

The current `user-pages` specification requires several timer failures to show API/backend messages directly in error toasts. The new UX direction is safer: global toasts should use product-controlled copy, while backend messages remain available for logging, inline scoped state, and recovery decisions such as refreshing the active timer after a conflict.

Affected guidance comes from `packages/web-shared/AGENTS.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and `docs/ui/patterns.md`. Because the helper lives in `packages/web-shared`, both SPAs must be verified even when the first consuming call sites are in `user-web`.

## Goals / Non-Goals

**Goals:**

- Add shared frontend feedback helpers for standard PrimeVue success/error toasts and destructive confirmations.
- Ensure error toasts show safe user-facing copy rather than raw backend/API error messages.
- Log backend/API error details with enough context for diagnostics.
- Keep backend/API error details available to feature composables for inline state and conflict-specific recovery logic.
- Reduce repeated toast calls where repeated API operations can opt into a shared feedback wrapper with explicit safe copy.
- Migrate current `user-web` toast and confirm helper call sites to the shared helper surface.

**Non-Goals:**

- No backend endpoint, database, OpenAPI, auth, or shared contract changes.
- No automatic toast behavior inside the low-level `requestJson()` helper.
- No global replacement of all inline errors with toasts.
- No movement of `<Toast>` or `<ConfirmDialog>` hosts into leaf components or shared helpers.
- No broad generic wrapper for every PrimeVue `toast.add()` or `confirm.require()` option until more call sites justify it.

## Decisions

### D1. Put shared feedback helpers in `@gitiempo/web-shared`

The shared helper should live in `packages/web-shared` because it is browser-only frontend leaf behavior shared by both SPAs. It should not live in `@gitiempo/shared`, which remains backend-safe and contract-focused, or `@gitiempo/web-config`, which remains theme/bootstrap-focused.

Alternative considered: keep the helper app-local in `user-web`. That avoids cross-app verification but conflicts with the requested global cross-SPA direction and increases drift risk when admin pages start adding toast feedback.

### D2. Accept PrimeVue service instances instead of hiding service lookup

The helper should expose a small factory such as `createAppToast(toast)` and `createAppConfirm(confirm)`. Consumers pass the `useToast()` or `useConfirm()` result from setup/composable code. This keeps the shared helper testable and avoids hiding Composition API service lookup in plain utility functions.

Alternative considered: export `useAppToast()` that calls `useToast()` internally. That is convenient but less explicit in tests and can make service ownership harder to see in non-component composables.

### D3. Use safe toast copy and log backend details

Error feedback helpers should accept the original `unknown` error for logging but should not use that backend-derived detail as toast text by default. Callers provide safe summary/detail copy such as “Could not start the timer” and “Please try again.” The original error message remains available for inline state or conflict detection when feature behavior depends on it.

Alternative considered: continue showing backend messages in toast details. That can leak implementation details and makes backend copy part of user-facing UX.

### D4. Keep API feedback opt-in, not automatic in `requestJson()`

Repeated API feedback can be reduced by an opt-in wrapper around an action or request, but low-level transport must not automatically show toasts. Many failures require local state updates, retry affordances, silent refresh handling, or domain-specific recovery before a global message is appropriate.

Alternative considered: add a global interceptor to `requestJson()` that always toasts on failure. That would create duplicate or incorrect feedback for background reads, auth/session flows, and feature-specific conflicts.

### D5. Standardize only destructive confirmation defaults first

The confirm helper should cover the documented destructive confirmation pattern: header, message, accept label, default reject label, danger accept props, and async accept support. It should not expose a broad mirror of all PrimeVue confirmation options until additional call sites prove that abstraction is needed.

Alternative considered: share a fully generic `confirm.require()` wrapper. That adds indirection without reducing meaningful repetition.

## Risks / Trade-offs

- **[Risk] Safe toast copy can become too generic to help users.** -> Mitigation: require action-specific summaries and details while keeping raw backend detail out of global toasts.
- **[Risk] Logging backend details from browser code can expose sensitive data to shared computers.** -> Mitigation: log only the error object/message and operation context; do not add tokens, request bodies, or user-entered secrets to log metadata.
- **[Risk] An opt-in request feedback wrapper can obscure local recovery logic.** -> Mitigation: keep domain-specific state and recovery in composables, and use the wrapper only for repeated boilerplate feedback around already-scoped operations.
- **[Risk] Moving helpers to `@gitiempo/web-shared` can break admin-web imports even if admin does not consume them yet.** -> Mitigation: verify `@gitiempo/web-shared`, `user-web`, and `admin-web` lint/typecheck after the shared export change.

## Migration Plan

1. Add shared feedback helper exports in `packages/web-shared` with focused tests for toast payloads, safe error detail behavior, logging, and destructive confirm defaults.
2. Migrate `useTimerPage`, `useProfileGithubConnection`, and `ProfileView` to the shared toast helper while preserving inline scoped error state and conflict refresh logic.
3. Migrate Profile GitHub disconnect confirmation to the shared destructive confirm helper while keeping `<ConfirmDialog>` hosted in the Profile route.
4. Evaluate repeated API outcome feedback and add an opt-in wrapper only where it removes repeated component/composable boilerplate without hiding feature recovery behavior.
5. Update affected tests so error toasts assert safe copy and logging/inline state preserve backend details where required.
6. Verify `@gitiempo/web-shared`, `user-web`, and `admin-web` lint/typecheck, plus focused test suites for affected flows.

## Open Questions

- Whether the first implementation should migrate non-toast login error normalization to the shared helper, or leave login views untouched until they need toast feedback.
- Whether browser logging should use `console.error` directly first or a small shared logger facade to simplify future telemetry integration.
