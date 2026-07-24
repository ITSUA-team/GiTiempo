## Why

Members can only sign in with email/password today. GitHub sign-in is a lower-friction option engineering teams expect, letting members authenticate with an identity they already use — without changing the backend session model, the Firebase UID, or how local membership is enforced.

## What Changes

- Add GitHub as an additional Firebase sign-in method (`GithubAuthProvider`) alongside email/password. The browser still exchanges the resulting Firebase ID token through the existing `POST /auth/login`, so the access/refresh session, the Firebase UID, and local membership checks are unchanged.
- Add `signInWithGitHub()` to the shared web authentication runtime/session code and surface a **Continue with GitHub** action on the user-web and admin-web login pages.
- Offer the same **Continue with GitHub** option during invite acceptance, gated by exact invite-email validation (the GitHub account email must match the invite).
- Recover from `auth/account-exists-with-different-credential`: sign in with the email's existing method, then link the pending GitHub credential so the member keeps their existing Firebase UID (no duplicate identity).
- Configure a dedicated, identity-only GitHub OAuth App requesting **only** `user:email` (no repository scopes) and enable the GitHub provider in Firebase Authentication.
- **BREAKING**: none. Backend, database, and existing email/password flows are untouched.

## Capabilities

### New Capabilities
- `github-signin`: GitHub authentication as a Firebase sign-in method — provider configuration and `user:email`-only scope, the shared `signInWithGitHub()` runtime, the `account-exists-with-different-credential` linking recovery that preserves the existing Firebase UID, and the explicit independence from the GitHub App integration and `github_connections` token storage.

### Modified Capabilities
- `frontend-auth`: the login pages and the invite-acceptance flow gain the GitHub sign-in option; invite acceptance validates the GitHub account email against the invite exactly, and the auth submission state covers the full GitHub attempt (including linking recovery) as it already does for email/password.

## Impact

- **Frontend**: the shared web authentication runtime/session module gains `signInWithGitHub()` and the linking-recovery helper; `apps/user-web` and `apps/admin-web` login pages and the invite-accept page gain a **Continue with GitHub** action plus its error surfaces. No change to the token-exchange call itself.
- **Backend**: none — `POST /auth/login` already verifies any Firebase ID token; no new endpoint, DTO, or database migration. The backend continues to not match or merge local users by email.
- **External configuration** (not code): a dedicated GitHub OAuth App (identity-only, `user:email`) and the GitHub provider enabled in Firebase Authentication, wired through existing frontend Firebase env/secret configuration.
- **Out of scope**: the GitHub App integration and `github_connections`; automatic integration-connection creation on sign-in; first-owner registration; the Chrome extension.
- **Docs/tests**: new `github-signin` spec + `frontend-auth` delta; affected UI docs; user-web, admin-web, shared-auth, and invite-flow tests covering the happy path and the account-exists linking recovery.
