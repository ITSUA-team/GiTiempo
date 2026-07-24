## Context

The web frontends already authenticate with Firebase Auth and exchange the resulting Firebase ID token through `POST /auth/login`, which verifies the token and issues the app access/refresh session keyed by Firebase UID. Email/password **and Google** sign-in already flow through this provider-agnostic exchange (see the existing `frontend-auth` "Google login succeeds" and "Google invite acceptance succeeds" scenarios). GitHub sign-in is therefore an additive frontend change: a new Firebase provider that reuses the existing exchange, session layer, and membership checks unchanged.

A separate concern already exists in the codebase — the **GitHub App integration** (repository/issue access, tokens in `github_connections`). This change must stay strictly independent of it.

Constraints:
- No backend endpoint, DTO, or database migration (`POST /auth/login` already accepts any Firebase ID token).
- The backend resolves sessions by Firebase UID and must not match or merge local users by email.
- A member's existing Firebase UID must be preserved when they add GitHub as a sign-in method.

## Goals / Non-Goals

**Goals:**
- Add GitHub as a Firebase sign-in provider on the user-web and admin-web login pages and on invite acceptance, reusing the existing token-exchange path.
- Add a shared `signInWithGitHub()` to the web authentication runtime alongside the existing Google helper.
- Request only the `user:email` scope from a dedicated, identity-only GitHub OAuth App.
- Recover from `auth/account-exists-with-different-credential` by linking the pending GitHub credential onto the existing Firebase account, preserving the UID.
- Gate GitHub invite acceptance on an exact invite-email match, mirroring the existing email/Google acceptance.

**Non-Goals:**
- Any backend, database, or `POST /auth/login` change.
- Any interaction with the GitHub App integration or `github_connections`; no automatic integration connection on sign-in.
- Matching or merging local users by email on the backend.
- GitHub sign-in on first-owner registration or in the Chrome extension.
- Requesting repository or organization scopes.

## Decisions

### D1: GitHub is just another Firebase provider on the existing exchange
GitHub sign-in produces a Firebase ID token exchanged through the unchanged `POST /auth/login`. No GitHub-specific backend path is introduced.
- *Rationale*: The exchange is already provider-agnostic (Google proves it); adding a backend GitHub flow would duplicate identity handling and break the "no backend change" boundary.
- *Alternative rejected*: A dedicated backend GitHub OAuth callback — unnecessary and out of scope.

### D2: `signInWithGitHub()` lives in the shared web auth runtime, mirroring the Google helper
The new helper is added next to the existing Google sign-in helper in the shared authentication/session module and consumed by both apps.
- *Rationale*: Single source of truth for provider setup, scope, and error handling; both login pages and invite accept reuse it.
- *Alternative rejected*: Per-app implementations — duplicates the linking-recovery logic and drifts.

### D3: Existing-account recovery links the pending credential onto the existing UID
On `auth/account-exists-with-different-credential`, capture the pending GitHub credential, resolve the email's existing sign-in method, authenticate with it, then `linkWithCredential(pendingGitHubCredential)`.
- *Rationale*: This is Firebase's documented account-linking pattern and the only path that keeps a single Firebase UID (so local membership stays intact).
- *Alternative rejected*: Creating/allowing a second Firebase identity for the same person — produces duplicate UIDs and breaks membership continuity.

### D4: A dedicated identity-only GitHub OAuth App, separate from the integration
Configure a new GitHub OAuth App used only for Firebase sign-in, requesting only `user:email`, and enable the GitHub provider in Firebase Authentication. It is wholly separate from the GitHub App integration used for repository data.
- *Rationale*: Keeps sign-in independent of integration tokens/`github_connections` and enforces least privilege (no repo scopes).
- *Alternative rejected*: Reusing the integration's GitHub OAuth credentials — couples sign-in to the integration and risks persisting a sign-in token as an integration token.

### D5: Invite acceptance reuses the existing server-side email-match enforcement
The exact invite-email check already lives in the backend: `invites.service.ts` verifies the Firebase ID token and throws `ForbiddenException('Invite email does not match identity')` when the resolved email differs from the invite. `InviteAcceptView.vue` signs in with GitHub, submits `POST /invites/accept`, and surfaces a mismatch through its existing failure handling (string-matching that message) while signing the provider out — exactly as the Google path does. No new frontend email validation is added.
- *Rationale*: Reuses the single source of truth for email match; keeps the frontend change to adding a GitHub `SubmitAction` and error mapper.
- *Alternative rejected*: Duplicating the email comparison in the browser — drift risk and redundant with the enforced backend rule.

## Risks / Trade-offs

- **Private/unverified GitHub email** → `user:email` is requested so Firebase can resolve a verified email; if none is available, sign-in surfaces guidance and invite acceptance fails the email-match safely rather than proceeding.
- **Account-linking UX is subtle (cancel, wrong password, popup blocked)** → follow the existing Google helper's popup/redirect strategy and single-flight submitting state; cover cancel/failed-recovery with tests so the UI always returns to a clean guest state.
- **Two GitHub OAuth apps could be confused (sign-in vs integration)** → name and scope them distinctly and document the separation; sign-in never writes to `github_connections`.
- **Provider-config drift across environments** → the GitHub provider + OAuth App credentials are environment configuration (Firebase console + env/secrets), not code; document the required setup so staging/prod match.

## Migration Plan

- No database migration. Steps: (1) create the dedicated GitHub OAuth App (`user:email` only) and enable the GitHub provider in Firebase Auth for each environment; (2) ship the frontend changes (shared runtime helper, login pages, invite accept); (3) verify the happy path and the account-exists linking recovery in staging.
- Rollback: hide the **Continue with GitHub** action (feature-flag or revert) and/or disable the GitHub provider in Firebase; no data to unwind since nothing new is persisted.

## Resolved (from the codebase)

- **Sign-in strategy**: the existing Google helper in `packages/web-shared/src/auth/runtime.ts` uses `signInWithPopup`; `signInWithGithub()` mirrors it with `GithubAuthProvider` and `addScope('user:email')`.
- **Provider seam is layered**: app-local Firebase init (`apps/*/src/lib/firebase.ts`) → shared `AuthRuntime` (`runtime.ts`, the only importer of `firebase/auth`) → `AuthSessionCore` (`session-core.ts`, adds `loginWithGithub` next to `loginWithGoogle`) → Pinia store → shared `AuthSignInForm.vue` (add a `submitGithub` emit + button, appears in both apps) and `InviteAcceptView.vue` (user-web only; add a GitHub `SubmitAction`).
- **This is the first account-linking flow**: the Google helper does a plain `signInWithPopup` with no linking recovery, so the `auth/account-exists-with-different-credential` handling is new and belongs inside the shared runtime helper so both login and invite paths inherit it.
- **Firebase config**: no new client env var — GitHub is enabled as a provider in the Firebase console; the client only constructs `GithubAuthProvider`.

## Open Questions

- `firebase-errors.ts` currently lives in `apps/user-web` only. Since the linking recovery is encapsulated in the runtime helper, the login views likely need no new error-code mapping; if they do, promote the helper to `web-shared` rather than duplicate it.
