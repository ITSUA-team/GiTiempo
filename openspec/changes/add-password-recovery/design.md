# Design

## Context

See `proposal.md` for motivation. The relevant current state, gathered from the codebase:

- Auth is Firebase client-side: `packages/web-shared/src/auth/runtime.ts` wraps `signInWithEmailAndPassword` / `signInWithPopup` / `signOut` from `firebase/auth`. The backend (`apps/api/src/auth`) only exchanges Firebase ID tokens for API JWTs — it has no password endpoints.
- Both SPAs render Login through the shared `packages/web-shared/src/components/AuthSignInForm.vue` (PrimeVue `Form` + `zodResolver(emailPasswordSignInSchema)`) inside `apps/user-web/src/views/LoginView.vue` and `apps/admin-web/src/views/LoginView.vue`. The form already has a `secondary-actions` slot used for the "Create workspace" link in user-web.
- The approved `.pen` (`GiTiempo/GITiempo.pen`, Auth · Login section) already places a "Forgot?" text link inline in the password field row on both the user and admin Login screens. No Password Recovery / Reset Password screen exists in the `.pen`.
- Firebase action-code precedent: `apps/user-web/src/views/InvitePasswordSetupView.vue` consumes `mode=resetPassword&oobCode=...` links with `verifyPasswordResetCode` + `confirmPasswordReset`, maps errors via `apps/user-web/src/lib/firebase-errors.ts`, toasts via `createAppToast`, and never sends raw passwords to GiTiempo APIs. Route `/invites/password-setup` is public with `allowAuthenticatedGuestFlow`.
- Toasts: one PrimeVue `<Toast>` host per SPA `App.vue`; `createAppToast(toast)` from `@gitiempo/web-shared/feedback` exposes `showSuccessToast(summary, detail)` and `showErrorToast({ detail, error, logContext })`.
- Routing: public routes are listed in each app's `router/index.ts`; `routeNames` constants live in `apps/<app>/src/constants/routes.ts`. Shared router helpers (`createProtectedRouter`) come from `@gitiempo/web-shared/router`.
- Shared validation: `packages/web-shared/src/validation/auth.ts` holds `emailPasswordSignInSchema`. `packages/shared/src/contracts/auth.ts` is backend-safe Zod contracts (no reset contract needed).
- App AGENTS.md rules: `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md` (admin auth must stay aligned with user-web), `packages/web-shared/AGENTS.md` (shared components need stable props/emits + two real SPA call sites; auth-leaf changes require both apps' lint/typecheck/test). `apps/api/AGENTS.md` notes the `FirebaseAdminService` extension path if backend-delivered email is ever needed.
- UI docs: `docs/ui/INDEX.md`, `docs/ui/pages-user.md` (Login Page section L149-181, Invite Password Setup Page L235-236), `docs/ui/pages-admin.md`, `docs/ui/patterns.md` (Toast rules). Login Page section enforces: "Do not add actions to this page unless docs, specs, and design are updated together."
- Notifications: one PrimeVue `<Toast>` host per SPA in root `App.vue` (top-right, `w-80`); `createAppToast(toast)` from `@gitiempo/web-shared/feedback` exposes `showSuccessToast(summary, detail)` (life 4000) and `showErrorToast({ detail, summary, logContext, error? })` (no life → manual dismiss, logs the error). General rule (`gitiempo-frontend-rules` SKILL.md): "one local inline state plus toast feedback" for failed API actions; pure client-side validation stays inline. Login renders errors inline only (page-specific "errors stay scoped to the attempt" rule). The closest precedent, `InvitePasswordSetupView.vue`, uses inline `Message` for client-side validation, inline `Message` + error toast for Firebase submit failures, an invalid-link panel state for missing params (no toast), error toast + invalid panel for expired/invalid codes, and a success panel + success toast for success (no auto-redirect).

## Goals / Non-Goals

**Goals:**

- Deliver the issue #474 flow end-to-end with success toast + redirect to Login, fully in-app, on both SPAs.
- Reuse the existing Firebase action-code pattern so raw passwords never reach GiTiempo APIs.
- Keep the recovery flow shared between SPAs where the behavior is identical, app-local where routing/store composition differs.
- Stay purely frontend: zero `apps/api` changes.

**Non-Goals:**

- Backend-driven custom reset email delivery (e.g., branded email via `FirebaseAdminService.generatePasswordResetLink`). The standard Firebase email template is acceptable for now; the extension point is documented below.
- Changing the `AuthSignInForm` visual language beyond adding the approved "Forgot?" link.
- Recovery for GitHub/Google OAuth-only accounts (Firebase `sendPasswordResetEmail` applies to email/password providers; OAuth users use their provider's reset).
- Admin-specific recovery route semantics beyond parity with user-web.
- A new `.pen` screen for the recovery/reset pages in this change (see Open Questions).

## Decisions

### D1: Pure frontend, Firebase client SDK `sendPasswordResetEmail`

Use `sendPasswordResetEmail(auth, email, { url: <in-app continue URL>, handleCodeInApp: true })` from `firebase/auth`. No new `apps/api` endpoint.

**Why over a backend endpoint:** the project's documented auth direction is "frontend authenticates with Firebase Auth". The existing invite password-setup flow already handles Firebase action codes entirely in-app. Issue #474 mentions "integrate backend API for sending the password reset link", but the standard Firebase client SDK call satisfies the user-visible requirement with less surface area, no new contract, and no throttle/auth changes. The `FirebaseAdminService` extension point (interface + real + fake + tests + e2e, per `apps/api/AGENTS.md`) remains the path if branded backend-delivered email is needed later.

**Alternatives considered:** backend `POST /auth/password-reset` that calls `generatePasswordResetLink` and sends a custom email — rejected for now (more surface area, contract churn, throttle config) but documented as the upgrade path.

### D2: App-hosted reset landing page (not Firebase-hosted)

`sendPasswordResetEmail`'s `actionCodeSettings.url` points at a new in-app route `/auth/reset-password` (both SPAs) with `handleCodeInApp: true`. The landing page runs `verifyPasswordResetCode` then `confirmPasswordReset`, exactly like `InvitePasswordSetupView.vue`.

**Why:** the issue requires a success notification and redirect to Login after the password update. Firebase's hosted reset page would hand control back to the app only via `continueUrl`, with no in-app toast. The invite password-setup precedent proves in-app action-code handling works and keeps passwords out of GiTiempo APIs.

**Alternatives considered:** default Firebase-hosted reset page with a `continueUrl` back to `/login` — rejected because it cannot show the in-app success toast and breaks parity with the invite password-setup pattern.

### D3: Shared `AuthSignInForm` gains an optional forgot-password link

Add an optional `forgotPasswordTo?: RouteLocationRaw` prop (and/or a `forgot-password` slot) to `packages/web-shared/src/components/AuthSignInForm.vue`. When provided, the form renders the "Forgot?" link inline in the password field row per the `.pen`. Each SPA's `LoginView.vue` passes its own recovery route. When the prop/slot is omitted, the form is unchanged (backward compatible).

**Why:** both Login screens share one form component and the `.pen` shows the same link treatment on both. A single shared change keeps visual parity and avoids two divergent implementations. Optional prop/slot keeps the component reusable and satisfies the `packages/web-shared` rule of stable props/emits with two real call sites.

**Alternatives considered:** app-local link injected via the existing `secondary-actions` slot — rejected because the `.pen` places the link inline with the password field, not below the social buttons.

### D4: Shared recovery form components + shared auth-runtime helper

Extend `packages/web-shared/src/auth/runtime.ts` `AuthRuntime` with `requestPasswordReset(email): Promise<void>` wrapping `sendPasswordResetEmail`. Add `resetPasswordWithActionCode(oobCode, newPassword): Promise<void>` wrapping `verifyPasswordResetCode` + `confirmPasswordReset` (or keep the latter in-view if the action-code URL/landing logic is too view-specific — see Open Questions). Add `emailOnlySchema` (email validation) to `packages/web-shared/src/validation/auth.ts` and a `newPasswordSchema` (password + confirmation, min 8, match) for the reset page.

Extract two small shared components — `AuthForgotPasswordForm.vue` (email-only form) and `AuthResetPasswordForm.vue` (new-password form) — both rendered inside `StandaloneSplitPage` + `AuthIntroPanel` so they share the approved auth visual language. Both have two real SPA call sites (user-web + admin-web), satisfying the `packages/web-shared` extraction rule.

**Why:** the two SPAs need identical recovery behavior; centralizing the Firebase calls and form components avoids drift and matches the existing shared-auth-leaf pattern (`session-core.ts`, `runtime.ts`, `AuthSignInForm.vue`).

**Alternatives considered:** keep forms app-local like `InvitePasswordSetupView.vue` — rejected for the request form (truly identical) and tentatively rejected for the reset form (also identical, see Open Questions for the action-code-landing edge).

### D5: Routing — new public routes in both SPAs

Add to both `apps/user-web/src/router/index.ts` and `apps/admin-web/src/router/index.ts`:

- `/auth/forgot-password` → `ForgotPasswordView`, `meta: { guestOnly: true }`, standalone (outside `AppShell`).
- `/auth/reset-password` → `ResetPasswordView`, `meta: { allowAuthenticatedGuestFlow: true }`, standalone. Consumes `mode` and `oobCode` query params.

Add `forgotPassword: "forgot-password"` and `resetPassword: "reset-password"` to each app's `constants/routes.ts` `routeNames`.

**Why:** mirrors the existing `/login` (guestOnly) and `/invites/password-setup` (allowAuthenticatedGuestFlow) public-route pattern. Keeps routing app-local per the `packages/web-shared` rule that `router/index.ts`, route maps, and route-level views stay app-local.

### D6: Error mapping reuses `firebase-errors.ts`

User-web already has `apps/user-web/src/lib/firebase-errors.ts` (`getFirebaseErrorCode`). Admin-web needs the same helper. Options: (a) extract `firebase-errors.ts` into `packages/web-shared` (two call sites after this change), or (b) duplicate a small app-local helper in admin-web. Recommended: extract to `packages/web-shared/src/firebase-errors.ts` and re-export from each app's `lib/firebase.ts` to keep one source of truth.

**Why:** recovery error mapping (expired code, invalid code, weak password, too-many-requests) must match the invite password-setup behavior. A shared helper prevents drift.

### D7: Docs and `.pen` parity

Update `docs/ui/pages-user.md` Login Page section to document the "Forgot password?" link, and add "Password Recovery Request Page" and "Reset Password Landing Page" sections. Mirror a shorter addition in `docs/ui/pages-admin.md`. State explicitly that the recovery/reset pages follow the approved auth visual language (`StandaloneSplitPage` + `AuthIntroPanel`) as the fallback until a `.pen` screen is added (Open Questions). This satisfies the docs rule that login-page actions require docs/specs/design updates together.

### D8: Responsiveness follows the Register Mobile pattern

The `.pen` defines **no** mobile/tablet variant for either Login screen (each is a single 1280×900 desktop frame) and **no** dedicated Password Recovery / Reset Password screen at all. The only established responsive auth pattern in the `.pen` is **"Register New Workflow Mobile"** (390×844): the brand-gradient left panel collapses into a full-width top header (`#6E3AA0 → #2E1442`, 135°), and the form area stacks into a single full-width column below it.

For this change:
- The recovery request and reset password pages SHALL follow the same Register Mobile collapse pattern on narrow viewports (brand panel → top header, single-column form), reusing whatever responsive behavior `StandaloneSplitPage` + `AuthIntroPanel` already provide. If those shared components already implement the collapse, the new views inherit it for free; if not, this change adds the mobile collapse to the shared components (touching a shared leaf → both SPA test suites must pass).
- The "Forgot?" link added to `AuthSignInForm` SHALL remain visible and correctly placed on narrow viewports (right edge of the password field row, brand color, 13px/600) — i.e. it must not overflow or disappear on mobile. Since the Login screens themselves have no `.pen` mobile variant, this is the minimum to avoid regressing mobile usability.
- A dedicated `.pen` mobile frame for login-family screens (login, recovery, reset) is **out of scope** for this change and tracked as a follow-up (see Open Questions and Workflow follow-up). The implementation uses the Register Mobile collapse as the approved-pattern fallback and documents this in `docs/ui/pages-user.md`.

**Why:** `docs/ui/INDEX.md` declares the project desktop-first MVP, but the recovery/reset pages are net-new screens and must still render acceptably on mobile (no horizontal scroll, usable tap targets). Reusing the only approved auth responsive pattern keeps the new screens consistent with registration rather than inventing a new mobile layout.

**Alternatives considered:** (a) ship desktop-only recovery/reset pages — rejected because they are net-new and would lock in a non-responsive pattern; (b) design new `.pen` mobile frames for all login-family screens in this change — rejected as scope creep (the Login screens' missing mobile variant is pre-existing tech debt, not introduced here).

### D9: Notification conventions follow the invite password-setup precedent

Recovery-flow notifications follow the project's toast/inline conventions and the closest precedent (`InvitePasswordSetupView.vue`):

| Outcome | Mechanism |
|---|---|
| Pure client-side validation (invalid email, weak/mismatched password) | Inline `Message` only — **no toast** (matches the project rule that pure validation stays inline) |
| Firebase API failure (send reset email, verify action code, confirm new password) | **Inline error state + error toast** via `createAppToast.showErrorToast({ detail, summary, logContext, error })` (manual dismiss; logs the error) — matches SKILL.md L131 and the invite precedent |
| Missing action-code params on the reset landing | Invalid-link **panel state** with a back-to-forgot link — **no toast** (matches invite precedent for missing params) |
| Expired/invalid action code on verify | Invalid-link **panel state + error toast** (matches invite precedent) |
| Recovery request success (email sent) | **In-panel success confirmation + success toast** (matches invite precedent; same copy for known/unknown email to avoid enumeration) |
| Reset password success | **Success toast + redirect to `/login`** — no success panel (deliberate deviation from the invite precedent, justified in D2; works because the single `<Toast>` host lives in `App.vue` above `<RouterView>`) |

`logContext` values (consistent with the established `{ action, feature }` convention):
- Request page send failure: `{ action: "send-password-reset", feature: "forgot-password" }`
- Reset page verify failure: `{ action: "verify-password-reset-link", feature: "reset-password" }`
- Reset page confirm failure: `{ action: "confirm-password-reset", feature: "reset-password" }`

The `action` strings reuse the verb phrases from the invite precedent (`verify-password-setup-link` → `verify-password-reset-link`, `confirm-password-reset` unchanged); `feature` disambiguates the surface (`invite-password-setup` vs `reset-password` vs `forgot-password`). Raw passwords MUST NOT appear in any toast, inline copy, or `logContext`/logger output.

**Why:** the recovery/reset pages are auth-action surfaces that fail against Firebase APIs, so they fall under the general "inline state + toast feedback" rule, not the Login-page-specific "errors stay scoped to the attempt" inline-only rule. Reusing the invite precedent keeps error handling consistent across all Firebase action-code flows.

**Alternatives considered:** (a) inline-only notifications for the recovery flow — rejected because it contradicts SKILL.md L131 and the invite precedent for API failures; (b) toast-only notifications — rejected because inline state is needed for field-level validation and for the invalid-link panel state that the invite precedent establishes.

## Risks / Trade-offs

- **[No `.pen` screen for recovery/reset pages]** → Mitigation: use the approved auth visual language (`StandaloneSplitPage`, `AuthIntroPanel`, gradient primary button, PrimeVue form patterns) as the parity fallback; record the gap in `docs/ui/pages-user.md` and flag adding a `.pen` screen as a follow-up. PrimeVue-only deviations, if any, will be documented in the final review per project rules.
- **[No `.pen` mobile variant for Login screens, and no `.pen` screen at all for recovery/reset]** → Mitigation: recovery/reset pages follow the Register New Workflow Mobile collapse pattern (brand panel → top header, single-column form) as the approved-pattern fallback; the "Forgot?" link is verified to remain visible and placed correctly on narrow viewports. Adding dedicated `.pen` mobile frames for login-family screens is a follow-up, not in this change. The Login screens' missing mobile variant is pre-existing tech debt, explicitly out of scope here.
- **[Account enumeration via timing]** `sendPasswordResetEmail` may resolve faster for unknown emails → Mitigation: always show the same success confirmation文案 regardless of outcome; do not surface Firebase's "user not found" text. Accept residual timing risk as standard for Firebase reset flows.
- **[Action-code landing on wrong SPA]** a user requesting reset from user-web could open the email link on a different device/browser that lands on admin-web (or vice versa) → Mitigation: both SPAs implement the same reset landing route and Firebase action-code handling, so the reset works on either app. The `continueUrl` is built per-SPA at request time, so the email link targets the requesting SPA.
- **[Auth emulator divergence]** `connectAuthEmulator` is active when `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set → Mitigation: verify the reset flow against the local Firebase Auth emulator (emulator supports `sendPasswordResetEmail` and action-code handling) and add a test that asserts the continue URL.
- **[Shared-leaf regression risk]** changing `AuthSignInForm.vue` and `runtime.ts` touches a shared auth leaf used by both SPAs → Mitigation: keep the `AuthSignInForm` change additive (optional prop/slot, default off); run both frontend test suites + lint + typecheck per the Definition of Done.
- **[Continue URL must be allowlisted in Firebase Console]** Firebase requires the action-code URL domain to be authorized → Mitigation: document the Firebase Console setup step in `docs/ui/pages-user.md` and in the change's verification tasks; not a code change.

## Migration Plan

1. Land shared pieces first: `emailOnlySchema`, `newPasswordSchema`, `requestPasswordReset` / `resetPasswordWithActionCode` runtime helpers, `firebase-errors.ts` extraction, shared form components.
2. Add the optional "Forgot password?" link to `AuthSignInForm.vue` (default off — no behavior change until SPAs opt in).
3. Add routes + `routeNames` + views in user-web, wire the link prop. Verify user-web end-to-end against the Firebase Auth emulator.
4. Repeat for admin-web.
5. Update `docs/ui/pages-user.md` and `docs/ui/pages-admin.md`.
6. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and both frontend test suites.

**Rollback:** the `AuthSignInForm` change is additive and defaults off; removing the new routes/views/revert the prop restores prior behavior. No backend or DB migration is involved, so rollback is a frontend revert.

## Open Questions

- **`.pen` screen for recovery/reset pages (desktop and mobile).** The `.pen` has the "Forgot?" link on both Login screens but no dedicated Password Recovery or Reset Password screen, and no mobile variant for any login-family screen (Login is 1280×900 desktop only). This change uses the approved auth visual language (`StandaloneSplitPage` + `AuthIntroPanel`) and the Register New Workflow Mobile collapse pattern as fallbacks. Should a `.pen` screen (desktop + mobile) be added before implementation, or is the fallback acceptable for now with a `.pen` follow-up? This does not change the specs or task breakdown — only the visual parity source — so it can be answered at implementation start.
- **Whether `StandaloneSplitPage` / `AuthIntroPanel` already implement the mobile collapse.** If they do, the recovery/reset views inherit responsive behavior for free. If not, this change adds the collapse to the shared components (shared-leaf change → both SPA test suites). Resolvable at implementation time by inspecting the components, without changing the specs.
- **Where `resetPasswordWithActionCode` lives.** Tentatively in the shared `AuthRuntime`. If the action-code landing needs app-specific URL/route handling (e.g., different post-success redirect targets), the helper may stay app-local in the view. Resolvable at implementation time without changing the specs.
- **Admin-web `firebase-errors.ts` extraction timing.** Extract to `packages/web-shared` now, or duplicate minimally in admin-web and extract later. Does not affect specs.