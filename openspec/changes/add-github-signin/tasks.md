## 1. External configuration (Firebase + GitHub OAuth App)

- [ ] 1.1 Create a dedicated, identity-only GitHub OAuth App requesting only `user:email` (no repository or organization scopes); keep it separate from the GitHub App integration used for repo data.
- [ ] 1.2 Enable the GitHub provider in Firebase Authentication for each environment using that OAuth App; confirm the authorized callback/redirect domains match the Firebase auth domain.
- [ ] 1.3 Confirm no new client env var is required — GitHub is console-configured and the client only constructs `GithubAuthProvider` (existing `VITE_FIREBASE_*` config is sufficient).

## 2. Shared auth runtime (`packages/web-shared/src/auth/runtime.ts`)

- [ ] 2.1 Extend the `firebase/auth` import with `GithubAuthProvider`, `fetchSignInMethodsForEmail`, and `linkWithCredential`.
- [ ] 2.2 Add `signInWithGithub(): Promise<string>` to the `AuthRuntime` interface and to `createDefaultAuthRuntime`, mirroring `signInWithGoogle`: `new GithubAuthProvider()`, `addScope('user:email')`, `signInWithPopup`, return the Firebase ID token.
- [ ] 2.3 Handle `auth/account-exists-with-different-credential` inside `signInWithGithub`: capture the pending credential via `GithubAuthProvider.credentialFromError`, resolve the existing method with `fetchSignInMethodsForEmail`, authenticate with it, `linkWithCredential(pendingCredential)`, then return the linked user's ID token so the existing Firebase UID is preserved.
- [ ] 2.4 On cancel or failed recovery, sign the partial identity out and rethrow a clean error so callers land back in a guest state with no stale tokens.

## 3. Shared session layer (`packages/web-shared/src/auth/session-core.ts`)

- [ ] 3.1 Add `loginWithGithub()` mirroring `loginWithGoogle` (lines ~234-240): call `getAuthRuntime().signInWithGithub()` then `exchangeFirebaseIdToken`, wrapped in the existing single-flight `runSubmittingLogin`.
- [ ] 3.2 Surface `loginWithGithub` on `baseSession` and re-export it through `packages/web-shared/src/auth/index.ts`.

## 4. Pinia stores

- [ ] 4.1 Expose `loginWithGithub` from the user-web and admin-web auth stores (`apps/user-web/src/stores/auth.ts`, `apps/admin-web/src/stores/auth.ts`), delegating to the session layer exactly like `loginWithGoogle`.

## 5. Shared sign-in form (`packages/web-shared/src/components/AuthSignInForm.vue`)

- [ ] 5.1 Add a `submitGithub` emit and a "Continue with GitHub" `Button` (`data-testid="sign-in-github"`) next to the existing Google button, disabled while `isSubmitting` — so both apps get the option from one component.

## 6. Login pages

- [ ] 6.1 In `apps/user-web/src/views/LoginView.vue` and `apps/admin-web/src/views/LoginView.vue`, handle `@submit-github="handleGithubSignIn"`: clear `errorMessage`, `await authStore.loginWithGithub()`, then `navigateAfterLogin()`, mapping failures through the existing `getErrorMessage` (user-web) / inline `getErrorMessage` (admin-web).

## 7. Invite acceptance (`apps/user-web/src/views/InviteAcceptView.vue`)

- [ ] 7.1 Add `'github'` to the `SubmitAction` union and its `activeAction`/`isBusy` handling, and render a "Continue with GitHub" option through `InviteOnboardingShell`.
- [ ] 7.2 Add `handleGithubAccept`: `getAuthRuntime().signInWithGithub()` → `completeInviteAcceptance(firebaseIdToken, 'github')`; rely on the backend's `ForbiddenException('Invite email does not match identity')` for mismatch and surface it via the existing `handleInviteAcceptanceFailure`, signing the provider out.
- [ ] 7.3 Add `mapGithubErrorMessage` covering `auth/popup-closed-by-user`, `auth/cancelled-popup-request`, and `auth/account-exists-with-different-credential`, using `getFirebaseErrorCode` from `apps/user-web/src/lib/firebase-errors.ts`.

## 8. Tests

- [ ] 8.1 `packages/web-shared/src/auth/runtime.spec.ts`: add a `GithubAuthProvider` fake (like the `GoogleAuthProvider` one); assert `signInWithGithub` calls `signInWithPopup` with it and requests `user:email`; cover the account-exists linking recovery (existing-method sign-in + `linkWithCredential`) and the cancel path.
- [ ] 8.2 `packages/web-shared/src/auth/session-core.spec.ts`: cover `loginWithGithub` token exchange and that the submitting state stays single-flight across sign-in + exchange.
- [ ] 8.3 `packages/web-shared/src/components/AuthSignInForm.spec.ts`: the GitHub button emits `submitGithub`.
- [ ] 8.4 `apps/user-web/src/views/LoginView.spec.ts` and `apps/admin-web/src/views/LoginView.spec.ts`: GitHub sign-in success and failure, mirroring the existing `sign-in-google` click tests via `createRuntimeMock`.
- [ ] 8.5 `apps/user-web/src/views/InviteAcceptView.spec.ts`: GitHub invite acceptance success, the email-mismatch rejection recovery, and popup-cancel mapping using the `createFirebaseError` helper.
- [ ] 8.6 `apps/user-web/src/stores/auth.spec.ts` and `apps/admin-web/src/stores/auth.spec.ts`: the `loginWithGithub` store action.

## 9. Docs & OpenSpec

- [ ] 9.1 Update the affected UI docs (login and invite acceptance) to mention **Continue with GitHub**.
- [ ] 9.2 Document the dedicated identity-only GitHub OAuth App and Firebase provider setup as an environment/config runbook, stressing independence from the GitHub App integration and `github_connections`.
- [ ] 9.3 After implementation, archive this OpenSpec change (`openspec archive add-github-signin`).

## 10. Verification

- [ ] 10.1 `pnpm --filter @gitiempo/web-shared lint && typecheck && test`
- [ ] 10.2 `pnpm --filter user-web lint && typecheck && test`
- [ ] 10.3 `pnpm --filter admin-web lint && typecheck && test`
- [ ] 10.4 Staging check: GitHub happy-path sign-in yields a normal session, and the account-exists recovery links GitHub onto an existing account while preserving the Firebase UID and active-membership access.
