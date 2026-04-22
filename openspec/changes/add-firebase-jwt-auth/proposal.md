## Why

`apps/api` still has no real authentication: the `AuthModule` is an empty skeleton and `GET /users/me` resolves to the first seeded user ordered by email. Before any product feature ships, the backend must verify Firebase identities, issue its own session tokens, and enforce authenticated access by default. This change implements the production-ready JWT authentication flow described in `docs/TECHNICAL-REQUIREMENTS.md` §2.2 and ADR-002, so that the User SPA, Admin SPA, and Chrome Extension can all authenticate against the API using the same mechanism.

## What Changes

- Implement `POST /auth/login` that verifies a Firebase ID token via `firebase-admin`, upserts a local `users` row from the verified identity, and returns an access/refresh token pair.
- Implement `POST /auth/refresh` with refresh token rotation and reuse detection (OAuth 2.0 Security BCP): revoked-then-reused tokens invalidate the entire token family.
- Implement `POST /auth/logout` that hard-deletes the supplied refresh token (current device only; multi-device logout is out of scope).
- Issue short-lived access tokens as HS256 JWTs (15 min, payload `{ sub, email, firebaseUid, iss, aud }`) and long-lived opaque refresh tokens (7 days) stored as `sha256` hashes in a new `refresh_tokens` table with `family_id` / `replaced_by` columns for reuse detection; refresh tokens use constant-time comparison via `timingSafeEqual`.
- Register a global `JwtAuthGuard` as `APP_GUARD` (secure-by-default / opt-out model) and add `@SkipAuth()` for public endpoints such as `/auth/login`, `/auth/refresh`, `/health`, `/metrics`.
- Add a `@CurrentUser()` parameter decorator that exposes `req.user` (full `AuthUser` or a single field via `@CurrentUser('sub')`) to controllers.
- Apply strict per-route throttling on `/auth/login` and `/auth/refresh` on top of the existing global `ThrottlerModule`.
- Extend Pino redaction to mask `Authorization` headers and `firebaseIdToken` / `refreshToken` request bodies; emit structured audit events (`auth.login.success`, `auth.login.firebase_rejected`, `auth.refresh.rotated`, `auth.refresh.reuse_detected`, `auth.logout`).
- Provide a test-only Firebase Admin fake (`NODE_ENV=test`) that accepts `test:<uid>:<email>` tokens, enabling deterministic e2e coverage without the real Firebase SDK.
- **BREAKING**: `GET /users/me` and `PATCH /users/me` stop returning the first seeded user and now resolve the authenticated user from `req.user.sub`. Seed and e2e fixtures are updated to the test Firebase path.
- **BREAKING**: every existing and future `apps/api` endpoint becomes authenticated by default; public endpoints must explicitly opt out via `@SkipAuth()`.

Deferred on purpose (follow-up proposals):

- `workspaces` / `workspace_members` tables and adding `role` + `workspaceId` to the JWT payload.
- `RolesGuard` / `ProjectScopeGuard`, multi-device logout (`?all=true`), access-token blacklist.
- Scheduled cleanup of expired `refresh_tokens` rows.
- Seamless JWT signing-key rotation (`kid` + multi-secret verification).

## Capabilities

### New Capabilities

- None. Existing capabilities are extended.

### Modified Capabilities

- `backend/auth`: adds concrete Firebase verification semantics, token payload shape, refresh rotation with reuse detection, global `@SkipAuth` opt-out model, `@CurrentUser()` parameter decorator, auth-endpoint throttling, and structured audit logging.
- `backend/users`: the current-user endpoint resolves the authenticated subject from the verified JWT instead of the dev placeholder "first user by email asc".
- `shared/contracts`: adds shared auth request/response contracts (`loginRequestSchema`, `refreshRequestSchema`, `logoutRequestSchema`, `tokenPairResponseSchema`) consumed by both `apps/api` and the SPAs.

## Impact

- **Code**
  - `apps/api/src/auth/*`: new guard, decorators, services (`TokenService`, `FirebaseAdminService`), `RefreshTokenRepository`, schema, controller with three endpoints.
  - `apps/api/src/app.module.ts`: `AuthModule` becomes global (exports `JwtAuthGuard` dependencies) and registers `APP_GUARD`.
  - `apps/api/src/users/*`: `UsersService.upsertFromFirebase` and `findById`; controller switches to `@CurrentUser()`.
  - `apps/api/src/main.ts`: Swagger document keeps `addBearerAuth()`; per-controller `@ApiBearerAuth()` annotations added.
  - `apps/api/src/config/env.validation.ts`: adds `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with escaped-newline transform).
  - `apps/api/src/config/logger.config.ts`: expanded redact paths.
  - `apps/api/src/db/schema.ts`: re-exports `refresh_tokens`.
  - `apps/api/drizzle/`: new generated migration creating `refresh_tokens` with `family_id`, `token_hash`, `replaced_by`, `revoked_at`, `expires_at` and indexes.
  - `apps/api/src/db/seed.ts`: seeds an initial user with a known `firebase_uid` usable by the test Firebase fake.
  - `apps/api/test/**` and `*.e2e-spec.ts`: switch to the fake Firebase flow; cover login, refresh rotation, reuse detection, logout, `@SkipAuth`, and `@CurrentUser` semantics.
  - `packages/shared/src/contracts/auth.ts` (new) and `packages/shared/src/index.ts` re-exports.
  - `packages/shared/openapi.json`: regenerated via `pnpm openapi:export`.

- **APIs**
  - New: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
  - Changed: `GET /users/me`, `PATCH /users/me` now require `Authorization: Bearer <access_token>`.
  - Global: every other route becomes authenticated unless explicitly marked `@SkipAuth()`.

- **Dependencies**
  - Add `firebase-admin`, `jsonwebtoken` (+ `@types/jsonwebtoken`) to `apps/api`. No new frontend dependencies in this change.

- **Infrastructure / ops**
  - Requires `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` to be set in every environment (dev, staging, prod, e2e).
  - DB migration `refresh_tokens` must run before the first login attempt.
  - `refresh_tokens` table will grow over time; a scheduled cleanup job is deferred to a follow-up proposal.
