## 1. Backend: OAuth sign-in service + endpoints

- [x] 1.1 Add `AuthGithubService` (`apps/api/src/auth/services/auth-github.service.ts`): build the authorize URL (dedicated OAuth App client id, `<APP_URL>/auth/github/callback`, `user:email`, signed state), exchange the code, read the primary verified email from `GET /user/emails`, sign a one-time handoff, and exchange the handoff for a session.
- [x] 1.2 Sign the CSRF state and the handoff as short-lived JWTs (`JWT_ACCESS_SECRET`) carrying a distinct `purpose` (and no issuer/audience), so neither can pass the access-token verifier. Enforce single-use on the handoff via a remembered `jti` (in-memory) so it cannot be replayed within its TTL.
- [x] 1.3 Add `AuthService.createSessionForVerifiedEmail(email)`: match an existing member by verified email, require an active membership, and issue the normal token pair reusing the member's Firebase UID; warn-log the no-user / no-membership / invalid-handoff reasons.
- [x] 1.4 Add `AuthGithubController` (`GET /auth/github/start`, `GET /auth/github/callback`, `POST /auth/github/session`, all `@SkipAuth`) + `GithubSessionDto`; wire into `auth.module.ts`.
- [x] 1.5 Add `GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` to `env.validation.ts` and the `.env.example` files (separate from `GITHUB_APP_*`).

## 2. Frontend: redirect + callback

- [x] 2.1 web-shared: add an `exchangeGithubSession` client passthrough (`http-client.ts`, `runtime.ts`) and a `loginWithGithubSession` session action (`session-core.ts`) that establishes the session from the returned token pair.
- [x] 2.2 Login pages (user-web + admin-web `LoginView.vue`): the **Continue with GitHub** button redirects to `<apiBaseUrl>/auth/github/start?app=<user|admin>`.
- [x] 2.3 Add a `/auth/github/callback` route + `GithubCallbackView` (both apps) that reads the handoff code (or `githubError`), calls `loginWithGithubSession`, and redirects to the dashboard (or back to login with a message).
- [x] 2.4 Keep `AuthSignInForm` `submitGithub` emit + `githubEnabled` gate; add `githubSignInEnabled` to each `appEnv` from `VITE_GITHUB_SIGNIN_ENABLED` (default on).

## 3. Remove the Firebase-client GitHub path

- [x] 3.1 Remove the Firebase `GithubAuthProvider` sign-in from `runtime.ts`/`session-core.ts` (never shipped); GitHub is login-only, so it is not offered on invite acceptance. Email/password and Google remain unchanged.

## 4. Tests

- [x] 4.1 `auth-github.service.spec.ts`: authorize URL (client id, callback, `user:email`, no PKCE), callback happy path → handoff, no-verified-email → error redirect, session exchange → token pair.
- [x] 4.2 `AuthService.createSessionForVerifiedEmail`: member found → pair; no member → 401.
- [x] 4.3 Frontend: `LoginView` GitHub button redirects; `GithubCallbackView` code → session → dashboard; updated runtime mocks (`exchangeGithubSession`).

## 5. External configuration (manual — requires a GitHub account)

- [ ] 5.1 Create a dedicated identity-only GitHub **OAuth App** (not a GitHub App): authorization callback `<APP_URL>/auth/github/callback`; scope `user:email` is requested in code.
- [ ] 5.2 Set `GITHUB_SIGNIN_CLIENT_ID`/`GITHUB_SIGNIN_CLIENT_SECRET` in each environment's API `.env`; ensure `USER_SPA_URL`/`ADMIN_SPA_URL` point at the frontends.

## 6. Verification

- [x] 6.1 `pnpm --filter @gitiempo/api lint typecheck test`; `pnpm --filter @gitiempo/web-shared lint typecheck test`; `pnpm --filter user-web ...`; `pnpm --filter admin-web ...`.
- [ ] 6.2 Staging: full start → callback → session round-trip yields a normal session for an existing member; a non-member email is rejected.

## 7. Docs & OpenSpec

- [x] 7.1 Update `docs/deployment.md` and `docs/ui/pages-user.md` to the backend OAuth-App flow.
- [ ] 7.2 After deploy verification, archive this OpenSpec change.
