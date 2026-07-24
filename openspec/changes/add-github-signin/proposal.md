## Why

Members can only sign in with email/password and Google today. GitHub sign-in is a lower-friction option engineering teams expect. A dedicated OAuth App keeps it a familiar "Sign in with GitHub" — no GitHub App install and no repository-permission prompts — and keeps authentication cleanly separate from the repo/issue integration.

## What Changes

- Add a backend, login-scoped GitHub OAuth flow: `GET /auth/github/start`, `GET /auth/github/callback`, and `POST /auth/github/session` (all unauthenticated). The browser leaves the SPA, the API runs the OAuth exchange, reads the member's primary verified GitHub email, matches an existing member, and issues the normal access/refresh session.
- Use a dedicated, identity-only GitHub **OAuth App** (`GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET`) requesting only the `user:email` scope — separate from the GitHub App integration and `github_connections`.
- Surface a **Continue with GitHub** action on the user-web and admin-web login pages that redirects to `/auth/github/start`; a new `/auth/github/callback` SPA view exchanges the returned one-time handoff code for a session. A `VITE_GITHUB_SIGNIN_ENABLED` flag gates the button per environment.
- Match an existing member by primary verified GitHub email only, reusing that member's existing Firebase UID. GitHub sign-in is login-only — it does not provision new users; invite acceptance and registration are unchanged.
- **BREAKING**: none. No database migration, no JWT-contract change, and no Firebase Admin change; email/password and Google sign-in are untouched.

## Capabilities

### New Capabilities
- `github-signin`: a backend login-scoped GitHub OAuth flow (start / callback / session) using a dedicated identity-only OAuth App with the `user:email` scope; it matches an existing member by primary verified email and issues the normal session (reusing the member's Firebase UID), delivers the session to the SPA via a one-time handoff code, and stays independent of the GitHub App integration and `github_connections`.

### Modified Capabilities
- None. GitHub sign-in is a self-contained flow; it does not change the Firebase login-exchange, invite-acceptance, or registration behavior.

## Impact

- **Backend** (`apps/api`): new `auth/github` controller + service, `AuthService.createSessionForVerifiedEmail`, `GithubSessionDto`, and `GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` env. State and the one-time handoff are short-lived, purpose-scoped JWTs signed with `JWT_ACCESS_SECRET` (they omit the issuer/audience the access-token verifier requires, so they can never pass as a session token). No database, JWT-contract, or Firebase Admin change.
- **Frontend** (`user-web` + `admin-web`): the login-page GitHub button redirects to the API; a new `/auth/github/callback` view exchanges the code through the shared auth client; `VITE_GITHUB_SIGNIN_ENABLED` gates the button. `packages/web-shared` gains an `exchangeGithubSession` client passthrough and a `loginWithGithubSession` session action.
- **External configuration** (not code): a dedicated GitHub **OAuth App** (identity-only, `user:email`) with authorization callback `<APP_URL>/auth/github/callback`; its Client ID/Secret go in `GITHUB_SIGNIN_*`. No Firebase provider configuration is involved.
- **Out of scope**: the GitHub App integration and `github_connections`; user provisioning via GitHub (login-only); GitHub on invite acceptance or first-owner registration; the Chrome extension.
- **Docs/tests**: the `github-signin` spec; user-web, admin-web, shared-auth, and api auth tests covering start/callback/session and the no-user / no-membership / invalid-handoff paths.
