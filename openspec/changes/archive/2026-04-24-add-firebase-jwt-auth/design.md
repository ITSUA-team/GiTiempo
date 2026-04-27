## Context

`apps/api` (NestJS 11 + Drizzle + `nestjs-zod` + Pino + Helmet + global `ThrottlerModule`) currently has an empty `AuthModule` skeleton and a dev-only `/users/me` that resolves to the first seeded user ordered by email. The Firebase env variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are already listed in `apps/api/.env.example` but are not wired into `src/config/env.validation.ts`. JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are already present in the local `.env` per `apps/api/AGENTS.md`'s env ownership rule.

`docs/TECHNICAL-REQUIREMENTS.md` §2.2 and `docs/adr/002-jwt-authentication.md` already mandate: frontend authenticates via Firebase Auth, sends the Firebase ID token to `POST /api/auth/login`, backend verifies the token via Firebase Admin, upserts a local `users` row, and returns a short-lived JWT access token (15 min) plus a long-lived refresh token (7 days) with rotation on each refresh. `docs/API-ENDPOINTS.md` §1 lists `/auth/login`, `/auth/refresh`, `/auth/logout`, each with the body shape used here.

OpenSpec already has descriptive requirements in `openspec/specs/auth/spec.md` for Firebase identity verification, token pair issuance, authenticated request enforcement, and local user upsert. This change makes those requirements concrete (payload shape, `@SkipAuth` model, reuse detection, audit events) and wires them into code.

Three clients depend on this: User SPA, Admin SPA, and the future Chrome Extension — all use `Authorization: Bearer <access_token>` and a shared refresh endpoint; no cookies or cross-origin session state. SPAs must keep working during/after deployment; the `refresh_tokens` migration and the first `AuthModule` wiring must ship together.

Stakeholders: backend (`apps/api`), shared contracts (`packages/shared`), and operators (env vars, migration order). Frontend code is not modified in this change but the shared contracts it will consume are added.

## Goals / Non-Goals

**Goals:**

- Production-ready Firebase → JWT authentication flow for all three API clients, matching ADR-002 and `docs/TECHNICAL-REQUIREMENTS.md` §2.2.
- Secure-by-default authentication: every `apps/api` route requires a valid access token unless it explicitly opts out via `@SkipAuth()`.
- Safe refresh-token handling: opaque random tokens, `sha256` hash at rest, `timingSafeEqual` comparison, rotation with reuse detection, hard delete on logout.
- Ergonomic controller API: `@SkipAuth()` to open a route and `@CurrentUser()` (full `AuthUser` or single-field form) to read the authenticated subject.
- Observability and defensive posture: per-route throttling on `/auth/*`, structured audit events, Pino redaction of bearer tokens and Firebase payloads.
- Deterministic e2e path: a `NODE_ENV=test` Firebase Admin fake that accepts `test:<uid>:<email>` tokens, so e2e suites do not need real Firebase credentials.
- Keep `/users/me` and `PATCH /users/me` working for the frontend, but now backed by the real authenticated subject.

**Non-Goals:**

- `workspaces` / `workspace_members` tables, `RolesGuard`, `ProjectScopeGuard`, or a `role` / `workspaceId` claim in the JWT payload. Deferred to a follow-up proposal.
- Multi-device logout (`?all=true`) or listing active sessions.
- Access-token revocation / blacklist (access tokens remain valid until their 15-minute TTL).
- Scheduled cleanup of expired rows in `refresh_tokens`.
- Seamless JWT signing-key rotation (`kid` header + multi-secret verification).
- Updates to `openspec/specs/auth/spec.md`; the change supplies delta specs under `openspec/changes/add-firebase-jwt-auth/specs/`.
- Frontend changes in `apps/user-web` and `apps/admin-web`. They consume the new shared contracts in a later change.

## Decisions

### D1. Refresh-token format: opaque random + `sha256` in DB

- Generate a 32-byte cryptographic random string (base64url encoded) as the refresh token. Store only `sha256(token)` in `refresh_tokens.token_hash` (unique). Compare using `crypto.timingSafeEqual`.
- **Why over JWT refresh:** trivial revocation, no payload leak through logs, shorter attack surface. The DB lookup is unavoidable regardless (JWT refresh would need a blacklist anyway for rotation + reuse detection).
- **Alternatives considered:** JWT refresh (rejected — complicates revoke/rotation); random token without hashing (rejected — equivalent to storing plaintext credentials).

### D2. Refresh rotation with reuse detection (OAuth 2.0 Security BCP)

- Each login starts a new `family_id`. Every refresh emits a new token in the same family and soft-marks the previous row as `revoked_at = now()`, storing `replaced_by` on the old row.
- If a refresh arrives that matches a row where `revoked_at IS NOT NULL`, the server hard-deletes the entire family (`DELETE FROM refresh_tokens WHERE family_id = :f`) and responds 401 `refresh_token_reuse_detected`.
- Logout hard-deletes only the current row.
- **Why:** Soft-delete on rotation is required so the old token can still be recognised as "spent" to trigger reuse detection. Hard-delete on logout and on reuse keeps the table bounded in the common paths.
- **Alternatives considered:** hard delete on rotation (rejected — kills reuse detection; downgraded-to-401 indistinguishable from an invalid token); separate `revoked_refresh_audit` table (rejected — extra table for the same information).

### D3. Access-token payload (minimal in this change)

- Payload: `{ sub: userId, email, firebaseUid, iss: 'gitiempo-api', aud: 'gitiempo-clients', iat, exp }`.
- **Why:** `workspaces` / `workspace_members` do not exist yet. Claiming `role` now would require either shipping those tables in this change (scope creep) or putting a placeholder claim that would still require a DB lookup — defeating the purpose.
- **Forward compatibility:** adding `role` and `workspaceId` later is backwards-compatible at the client (extra claims are ignored) and backwards-compatible at the server if the verification schema is extended with optional fields. A 15-minute access TTL means every client fully migrates within one refresh window after the next change ships.
- **Alternatives considered:** variant B (role in payload now) — rejected per user decision and because the role source of truth does not exist yet; variant C (hybrid with cached role lookup) — deferred until there is a role to cache.

### D4. JWT algorithm and claims

- HS256. Distinct secrets: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Access-token secret is used only by `TokenService.signAccess` / `verifyAccess`; refresh-token opaque generation does not need a JWT secret (it is not a JWT).
- Include `iss` and `aud` on every access token and verify both on every request. Mismatches return 401.
- **Why HS256:** single verifier (the API itself); asymmetric keys add operational cost (`RS256`, `jwks`) with no benefit for this topology.
- **Alternatives considered:** `RS256` (rejected — no downstream verifier); shared secret between access and refresh (rejected — lets a refresh be replayed as an access and vice versa).

### D5. Firebase Admin integration and `PRIVATE_KEY` normalization

- `FirebaseAdminService` lazily initialises a single `firebase-admin` app using `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
- `FIREBASE_PRIVATE_KEY` is normalised in `env.validation.ts` with `.transform((s) => s.replace(/\\n/g, '\n'))` because `.env` files store the PEM with literal `\n` sequences.
- `verifyIdToken(token, checkRevoked = true)` is called on login only. Once the local access token is issued, we rely on our own JWT signature and expiry.
- **Alternatives considered:** a long-running cron that pre-fetches Firebase certs (rejected — `firebase-admin` already caches certs); running against the Firebase emulator (deferred — `docker-compose` is not in scope of this change, and a fake provider covers testing needs better).

### D6. Test-only Firebase fake

- `FirebaseAdminService` is injected via a DI token so that `NODE_ENV=test` can swap in a fake implementation that accepts tokens of the form `test:<uid>:<email>[:<name>]` and returns a `DecodedIdToken`-shaped object.
- Real-path code never executes in e2e, so no Firebase network calls, no real credentials required for CI or local e2e.
- **Alternatives considered:** Firebase Auth emulator (rejected for now — new infra, slower CI, low return on investment); monkey-patching `firebase-admin` at runtime (rejected — brittle).

### D7. Secure-by-default guard model

- A single `JwtAuthGuard` is registered as `APP_GUARD`. It inspects `Reflector` for the `SKIP_AUTH_KEY` (from `@SkipAuth()`) at the handler and class levels; if present, the request bypasses token verification. Otherwise the bearer token is extracted, verified (signature + `iss` + `aud` + `exp`), and mapped onto `req.user`.
- **Why:** new routes are protected by default; forgetting a guard cannot accidentally leak an endpoint. This matches the stated goal explicitly.
- **Public routes using `@SkipAuth()` in this change:** `POST /auth/login`, `POST /auth/refresh`, plus the already public `GET /health` and `GET /metrics` defined in `CommonsModule`.
- **Alternatives considered:** per-controller `@UseGuards(JwtAuthGuard)` opt-in — rejected because it is fragile and contradicts the user requirement.

### D8. `@CurrentUser()` decorator ergonomics

- `@CurrentUser()` returns the full `AuthUser`. `@CurrentUser('sub')` returns a single field. Implemented with `createParamDecorator` reading `req.user` populated by `JwtAuthGuard`.
- `AuthUser = { sub: string; email: string; firebaseUid: string }` today; additional fields can be added without breaking callers.

### D9. Per-route throttling on `/auth/*`

- Global `ThrottlerModule` stays as configured. `/auth/login` and `/auth/refresh` add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` to cap abuse from a single IP.
- **Why:** login is a hot target for credential-stuffing and token-replay attempts. Stricter throttling is cheap and orthogonal to JWT security.

### D10. Logging, redaction, and audit events

- Extend `config/logger.config.ts` redact paths: `req.headers.authorization`, `req.body.firebaseIdToken`, `req.body.refreshToken`, `res.body.accessToken`, `res.body.refreshToken`.
- Emit structured events from `AuthService` at `info` level (success paths) and `warn` level (`firebase_rejected`, `reuse_detected`): `{ event: 'auth.login.success', userId, firebaseUid }`, etc. No token bodies are ever logged.

### D11. `/users/me` cutover

- `UsersService.findCurrent()` is removed; `UsersService.findById(id)` + `UsersService.updateById(id, input)` replace it.
- `UsersController` reads `@CurrentUser('sub')` and delegates. The dev stub "first user by email asc" is deleted in the same commit as the migration and seed update.
- `UsersService.upsertFromFirebase({ firebaseUid, email, displayName, avatarUrl })` is the only write path that runs during login; it performs an insert with `ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url, updated_at = now()` using Drizzle's `onConflictDoUpdate`.

### D12. Deployment ordering and seed

- The new Drizzle migration creates `refresh_tokens` and must run before API start on every environment. `apps/api/AGENTS.md` already documents `pnpm --filter @gitiempo/api db:migrate` as a required step before e2e; that instruction remains valid.
- `db/seed.ts` is updated so the seeded admin user has a `firebase_uid` matching the test Firebase fake's default token (`test:admin-uid:admin@example.com`). Frontend and existing e2e that relied on "first user by email asc" are pointed at this seeded user via the fake path.

## Planned File Changes

Grouped by package, per the `design` rule. Controller- and service-level details already appear in D1–D12 above; this section only enumerates the touched files.

**`apps/api`** (see `apps/api/AGENTS.md` for commands and env-ownership rules):

- New:
  - `src/auth/guards/jwt-auth.guard.ts`
  - `src/auth/decorators/skip-auth.decorator.ts`
  - `src/auth/decorators/current-user.decorator.ts`
  - `src/auth/services/token.service.ts`
  - `src/auth/services/firebase-admin.service.ts` (+ DI token, `FakeFirebaseAdminService` in `src/auth/services/firebase-admin.fake.ts` for `NODE_ENV=test`)
  - `src/auth/repositories/refresh-token.repository.ts`
  - `src/auth/schemas/refresh-tokens.schema.ts`
  - `src/auth/types/auth-user.ts`
  - `src/auth/types/jwt-payload.ts`
  - `drizzle/<timestamp>_refresh_tokens.sql` (generated via `pnpm --filter @gitiempo/api db:generate` or equivalent project script)
  - Unit test files per service/guard/decorator, and `test/auth.e2e-spec.ts`.

- Modified:
  - `src/auth/auth.module.ts`: wires providers, exposes `APP_GUARD = JwtAuthGuard`, imports `ConfigModule` (already global).
  - `src/auth/controllers/auth.controller.ts`: adds `POST /login`, `POST /refresh`, `POST /logout` with `@SkipAuth()` where applicable and `@Throttle(...)` on login + refresh.
  - `src/auth/services/auth.service.ts`: orchestrates login/refresh/logout.
  - `src/app.module.ts`: no structural change except relying on `AuthModule` registering `APP_GUARD`.
  - `src/config/env.validation.ts`: adds JWT and Firebase variables with the `PRIVATE_KEY` newline transform.
  - `src/config/logger.config.ts`: extends redact paths.
  - `src/db/schema.ts`: re-exports `refresh_tokens`.
  - `src/db/seed.ts`: seeds initial user with deterministic `firebase_uid`.
  - `src/users/services/users.service.ts`: replaces `findCurrent` with `findById` / `updateById`; adds `upsertFromFirebase`.
  - `src/users/controllers/users.controller.ts`: switches to `@CurrentUser('sub')`.
  - `src/main.ts`: Swagger keeps `addBearerAuth()`; no functional change besides possibly adding `@ApiBearerAuth()` on controllers.

**`packages/shared`** (no package-level `AGENTS.md`; follow monorepo rules in root `AGENTS.md`):

- New: `src/contracts/auth.ts` exporting `loginRequestSchema`, `refreshRequestSchema`, `logoutRequestSchema`, `tokenPairResponseSchema`, and inferred types.
- Modified: `src/index.ts` re-exports; `openapi.json` is regenerated by `pnpm openapi:export` after API changes land.

## Backend / Frontend Coordination

- This change can be applied in two valid scopes depending on the requested work: full-stack auth implementation, or frontend-only implementation for the UI tasks already captured in `tasks.md` section `14`.
- When the requested work is frontend-only, the agent may limit changes to `apps/user-web`, `apps/admin-web`, and any directly related shared frontend packages/config without touching `apps/api`.
- Shared contract consumers (User SPA, Admin SPA, future Chrome Extension) can start calling the new endpoints once `packages/shared` is republished/linked, but that remains separate from frontend-only visual or shell work.
- The Swagger document remains the source of truth for cross-layer contracts. `pnpm openapi:export` runs after the API is green, and the regenerated `packages/shared/openapi.json` is committed in the same change so downstream generators keep working.
- Until SPAs adopt the new endpoints, they continue to call `/users/me` unauthenticated today. **BREAKING**: once this change is deployed, they will receive 401 until they supply a bearer token. This cutover is intentional and explicitly flagged in the proposal; coordinated rollout is an operator concern (ship frontend changes in a follow-up change before deploying this one to production, or gate the deploy via environment).

## Frontend Tooling Guardrails

- Frontend work under this change MUST not rely on deprecated TypeScript compiler options when a supported configuration exists.
- In particular, agents should remove deprecated `baseUrl` usage from the Vue app tsconfigs instead of normalizing around `ignoreDeprecations` as a long-term solution.
- Temporary deprecation suppression is acceptable only as a short-lived bridge while migrating to the non-deprecated configuration in the same change; do not leave new suppression-only config behind once the migration is complete.

## Risks / Trade-offs

- **[Risk] SPA regressions.** The breaking cutover on `/users/me` means the two SPAs must be updated before this change is deployed to any shared environment. → **Mitigation:** land and deploy this change to a staging environment first; follow up immediately with the SPA auth-wiring proposal; document the requirement in the PR description.
- **[Risk] `refresh_tokens` table growth.** Expired rows accumulate since scheduled cleanup is out of scope. → **Mitigation:** rotation soft-deletes and logout/reuse hard-deletes keep the common paths bounded. Long-tail growth is accepted as tech debt; a cleanup cron is explicitly deferred to a follow-up.
- **[Risk] `FIREBASE_PRIVATE_KEY` mis-escaping.** Common foot-gun across envs. → **Mitigation:** `env.validation.ts` normalises `\n` → `\n`; startup fails loudly if the PEM does not parse once `firebase-admin` initialises.
- **[Risk] Access token cannot be revoked within its 15-minute TTL.** → **Mitigation:** short TTL is the mitigation; documented in ADR-002. Any future need for faster revocation goes into a separate proposal (Redis blacklist or shorter TTL).
- **[Risk] Throttler ordering.** `apps/api` already registers a global `ThrottlerGuard`; adding `@Throttle` on `/auth/*` must not accidentally disable the global limiter. → **Mitigation:** use named throttler configs and unit-test the endpoint behaviour under both global and per-route limits.
- **[Risk] Test Firebase fake diverges from real behaviour.** → **Mitigation:** keep the fake's decoded-token shape identical to the subset of `DecodedIdToken` the app reads (`uid`, `email`, `name`, `picture`); unit-test `AuthService` against the fake and against a captured real Firebase payload fixture.
- **[Risk] `AuthModule` becoming global pulls `JwtAuthGuard` into unrelated test modules.** → **Mitigation:** override the guard in module-level tests with a `{ provide: APP_GUARD, useValue: { canActivate: () => true } }` where needed, as already done for other global providers in the repo.
- **[Trade-off] Opaque refresh tokens require a DB round-trip on every refresh.** Accepted: refresh is infrequent (once per 15 minutes per active client) and the round-trip is necessary for revocation.
- **[Trade-off] No `role` claim yet.** Every endpoint that needs authorisation (not just authentication) will need an extra lookup until `workspace_members` ships. Accepted; no authz-gated endpoints exist in this change.

## Migration Plan

1. Merge this change; CI runs `pnpm --filter @gitiempo/api lint && typecheck && test`, and `pnpm openapi:export` confirms the shared contract snapshot is up to date.
2. On the target environment, apply the new Drizzle migration (`pnpm --filter @gitiempo/api db:migrate`). This creates `refresh_tokens`.
3. Confirm `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 bytes each), `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are present in the environment. App startup will fail loudly otherwise.
4. Restart `apps/api`. The global guard activates; existing clients without bearer tokens start receiving 401. This is the intended cutover.
5. Re-seed or top up data via `pnpm --filter @gitiempo/api db:seed` so the admin user's `firebase_uid` matches a real Firebase identity (prod) or the test fake (dev/e2e).

**Rollback:** revert the commit and re-deploy the previous API binary. The new `refresh_tokens` table is safe to leave in place (dropping it is non-destructive). Any rows inserted during the short window where the new version was live can be deleted (`TRUNCATE refresh_tokens`) without affecting the `users` table.

## Open Questions

None. All decisions from the exploration session were locked in: cleanup strategy D2 (soft on rotation, hard on logout/reuse), payload D3 (minimal now, `role` later with `workspace_members`), and graceful key rotation deferred.
