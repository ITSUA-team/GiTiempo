## Context

The app authenticates with Firebase (email/password, Google): the browser gets a Firebase ID token and exchanges it at `POST /auth/login`, which verifies it, looks the member up by `firebase_uid`, and issues the app access/refresh session. Session identity is Firebase-UID-keyed (`users.firebase_uid` is `NOT NULL UNIQUE`; every access token carries a `firebaseUid` claim). A separate GitHub **App** integration already exists for repo/issue data (`github_connections`); it is a *connect* flow that requires an existing session and must stay independent of sign-in.

This change adds GitHub as a sign-in method **on the backend** rather than through Firebase, so it can use a dedicated identity-only OAuth App and a familiar "Sign in with GitHub" without a Firebase provider or a GitHub App install.

## Goals / Non-Goals

**Goals:**
- Let an existing member sign in with GitHub and receive the normal app session.
- Reuse the existing session issuance and the member's existing Firebase UID — no schema, JWT-contract, or Firebase Admin change.
- Keep sign-in fully independent of the GitHub App integration (separate OAuth App and secrets).

**Non-Goals:**
- Provisioning new users via GitHub (login-only; new members still come through invite/registration).
- GitHub on invite acceptance or first-owner registration.
- Any change to email/password or Google sign-in.

## Decisions

### D1: Sign-in runs on the backend, not through Firebase
The API owns the OAuth flow (`/auth/github/start`, `/auth/github/callback`, `/auth/github/session`) instead of a client-side Firebase `GithubAuthProvider`.
- *Rationale*: a dedicated OAuth App gives a familiar `Sign in with GitHub` with no GitHub App install and no repo-permission prompts, and keeps auth separate from the repo integration; the backend already owns session issuance.
- *Alternative rejected*: Firebase `GithubAuthProvider` — requires enabling a GitHub provider in the Firebase console and couples sign-in setup to Firebase; the team chose the backend OAuth App.

### D2: Match an existing member by primary verified GitHub email
The callback reads the member's primary **verified** email from `GET /user/emails` and `AuthService.createSessionForVerifiedEmail` matches an existing member (`findUserByEmail`), requires an active membership, and mints the session — reusing the member's existing `firebase_uid`.
- *Rationale*: keeps the Firebase-UID invariant and the JWT contract intact with no new column; sign-in authenticates existing members exactly like email/password login.
- *Alternative rejected*: creating users or making `firebase_uid` nullable — a large auth-core change for a login-only feature.

### D3: State and session handoff are short-lived purpose-scoped JWTs
CSRF `state` and the SPA handoff `code` are JWTs signed with `JWT_ACCESS_SECRET` but omitting the issuer/audience the access-token verifier requires and carrying a distinct `purpose`, so neither can pass as a session token. The callback redirects to `<SPA>/auth/github/callback?code=<handoff>`; the SPA `POST`s it to `/auth/github/session` for the token pair.
- *Rationale*: stateless, no new table, reuses the app's JWT signing.
- *Alternative rejected*: a DB-backed one-time code table — more infrastructure; see the replay risk below.

### D4: A dedicated identity-only OAuth App, separate from the integration
`GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` with the `user:email` scope and authorization callback `<APP_URL>/auth/github/callback`. Never touches `GITHUB_APP_*` or `github_connections`.
- *Rationale*: least privilege, clean separation, a single simple OAuth-App callback URL.

### D5: GitHub sign-in is login-only
No provisioning, no invite acceptance, no registration via GitHub.
- *Rationale*: keeps the change small and the identity model unchanged; new members onboard through the existing invite flow.

## Risks / Trade-offs

- **Handoff replay** → the handoff JWT is stateless and replayable within its 60s TTL. A `?code=` intercepted from the redirect (browser history, Referer, logs) could be re-posted to mint a session. Mitigation: 60s TTL + HTTPS. Harden with a single-use nonce store before treating it as production-grade; the DTO/comments call it "one-time" but do not yet enforce it.
- **Email not a member** → a verified GitHub email with no matching active member returns 401 (`no_user`). This is intended (login-only), and is logged for diagnosis.
- **Config coherence** → `VITE_GITHUB_SIGNIN_ENABLED` (frontend, default on) and `GITHUB_SIGNIN_*` (backend) are independent; if the button shows without the backend configured the flow fails with a service error. Document that both must be set per environment.
- **PII in logs** → failure warns include the member email; confirm this is acceptable or hash it.

## Migration Plan

No database migration. Steps: (1) create a dedicated identity-only GitHub **OAuth App** (not a GitHub App) with callback `<APP_URL>/auth/github/callback`; (2) set `GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` in the API env; (3) ship the code; (4) verify the start → callback → session round-trip in staging. Rollback: set `VITE_GITHUB_SIGNIN_ENABLED=false` to hide the button; nothing new is persisted.

## Open Questions

- Whether to enforce single-use on the handoff code (nonce store) before production, given the replay window above.
