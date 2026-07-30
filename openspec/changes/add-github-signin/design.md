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

### D3: A purpose-scoped state JWT, but an opaque server-side session handoff
CSRF `state` is a JWT signed with `JWT_ACCESS_SECRET` that omits the issuer/audience the access-token verifier requires and carries a distinct `purpose`, so it can never pass as a session token; it also carries which app to return to and the sanitized post-login redirect target. The SPA handoff `code` is **not** a token: it is a 32-byte random opaque code held in a short-lived in-memory store that maps it to the verified email, so the code itself carries no payload. The callback redirects to `<SPA>/auth/github/callback?code=<handoff>`; the SPA `POST`s it to `/auth/github/session` for the token pair.
- *Rationale*: the state benefits from being stateless and self-describing. The handoff must not be — a JWT is readable by anyone who sees the URL, so a signed handoff put the verified email into a query string that leaks through browser history, proxy logs, and referrer/telemetry (RFC 9700 §§4.2-4.3). An opaque code reveals nothing when decoded, and deleting it on read makes single-use trivially enforceable.
- *Alternative rejected*: a signed handoff JWT carrying the email — the original design, replaced because of the leak above. A DB-backed one-time code table stays the natural next step if the API is scaled out (see Open Questions), but is unnecessary infrastructure for a single instance.

### D4: A dedicated identity-only OAuth App, separate from the integration
`GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` with the `user:email` scope and authorization callback `<APP_URL>/auth/github/callback`. Never touches `GITHUB_APP_*` or `github_connections`.
- *Rationale*: least privilege, clean separation, a single simple OAuth-App callback URL.

### D5: GitHub sign-in is login-only
No provisioning, no invite acceptance, no registration via GitHub.
- *Rationale*: keeps the change small and the identity model unchanged; new members onboard through the existing invite flow.

### D6: The state is bound to the browser that started the flow
`/auth/github/start` mints a 32-byte nonce, returns it in an HttpOnly, SameSite=Lax cookie (`gh_oauth_state`, scoped to `/auth/github`, expiring with the 10-minute state) and signs only its SHA-256 hash into the state. Minting a session requires a constant-time match between the cookie's nonce and the state's hash; the callback clears the cookie, so the binding is single-use. A missing or mismatched cookie is reported as a state error.
- *Rationale*: a signed state proves only that *we* issued it, not that we issued it to **this** browser. Without the binding an attacker could start a flow, authorize it with their own GitHub account, and hand the resulting callback URL to a victim — logging the victim into the attacker's account (login CSRF, RFC 9700 §4.7.1).
- *Note*: which app to return to is read from the state's `app` claim **without** requiring the binding. That is a redirect target, not a security decision, so a denial or a failed exchange still returns the user to the app they started from.
- *Alternative rejected*: `SameSite=Strict` — it would drop the cookie on the top-level GET redirect back from GitHub, breaking every flow.

## Risks / Trade-offs

- **Handoff replay** → the handoff code is deleted from the store on first read, so a replayed callback URL cannot mint a second session; unclaimed codes also expire after 60s. The store is in-memory — sufficient for a single API instance; a horizontally scaled deployment would need a shared store (e.g. the DB, like `github_oauth_states`).
- **Email not a member** → a verified GitHub email with no matching active member returns 401 (`no_user`). This is intended (login-only), and is logged for diagnosis.
- **Config coherence** → `VITE_GITHUB_SIGNIN_ENABLED` (frontend, default off — the button shows only when it is `'true'`) and `GITHUB_SIGNIN_*` (backend) are independent; enable the flag only where the backend is configured, so the button never shows a flow that cannot complete. The staging deploy workflow passes the flag through from a repo variable (unset ⇒ off) and validates it is a strict boolean.
- **PII in logs** → resolved: failure warns carry only the email *domain* (`no_user`) or the `userId` (`no_membership`), never the address, and the invalid-handoff warn carries no identifier at all.

## Migration Plan

No database migration. Steps: (1) create a dedicated identity-only GitHub **OAuth App** (not a GitHub App) with callback `<APP_URL>/auth/github/callback`; (2) set `GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` in the API env; (3) ship the code; (4) verify the start → callback → session round-trip in staging. Rollback: set `VITE_GITHUB_SIGNIN_ENABLED=false` to hide the button; nothing new is persisted.

## Open Questions

- If the API is ever horizontally scaled, move the single-use handoff store to a shared backend, so a code issued by one instance can be claimed — and only once — by any of them. The state check needs nothing: it is a signature plus a cookie-nonce match, with no server-side store to share.
