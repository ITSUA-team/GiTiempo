## 1. Dependencies & env wiring

- [x] 1.1 Add `firebase-admin`, `jsonwebtoken`, and `@types/jsonwebtoken` to `apps/api/package.json` and install via `pnpm install`
- [x] 1.2 Extend `apps/api/src/config/env.validation.ts` with `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with `\\n` → `\n` transform) and ensure startup fails on missing/invalid values
- [x] 1.3 Update `apps/api/.env.example` if any new variable is missing, keeping values as placeholders
- [x] 1.4 Extend `apps/api/src/config/logger.config.ts` Pino redact paths: `req.headers.authorization`, `req.body.firebaseIdToken`, `req.body.refreshToken`, `res.body.accessToken`, `res.body.refreshToken`

## 2. Database schema for refresh tokens

- [x] 2.1 Create `apps/api/src/auth/schemas/refresh-tokens.schema.ts` (Drizzle table `refresh_tokens` with `id`, `user_id` FK, `family_id`, `token_hash` UNIQUE, `replaced_by` nullable self-ref, `revoked_at` nullable, `expires_at`, `created_at`, indexes on `user_id`, `family_id`, `token_hash`)
- [x] 2.2 Re-export `refresh_tokens` from `apps/api/src/db/schema.ts`
- [x] 2.3 Generate Drizzle migration via the project's db:generate script and commit the generated SQL under `apps/api/drizzle/`
- [x] 2.4 Run the migration locally (`pnpm --filter @gitiempo/api db:migrate`) and verify the table/indexes exist

## 3. Auth types, decorators, and guard

- [x] 3.1 Add `apps/api/src/auth/types/jwt-payload.ts` with `{ sub, email, firebaseUid, iss, aud, iat, exp }`
- [x] 3.2 Add `apps/api/src/auth/types/auth-user.ts` with `AuthUser = { sub, email, firebaseUid }`
- [x] 3.3 Create `apps/api/src/auth/decorators/skip-auth.decorator.ts` exporting `SKIP_AUTH_KEY` and `@SkipAuth()` via `SetMetadata`
- [x] 3.4 Create `apps/api/src/auth/decorators/current-user.decorator.ts` as a `createParamDecorator` that returns `req.user` (full) or `req.user[key]` when a string key is passed
- [x] 3.5 Create `apps/api/src/auth/guards/jwt-auth.guard.ts` that (a) reads `SKIP_AUTH_KEY` at handler and class level via `Reflector`, (b) extracts the `Authorization: Bearer <token>` header, (c) verifies signature + `iss` + `aud` + `exp` with `JWT_ACCESS_SECRET`, (d) maps claims onto `req.user` as `AuthUser`, (e) throws `UnauthorizedException` with a generic message on any failure

## 4. Token service

- [x] 4.1 Create `apps/api/src/auth/services/token.service.ts` with `signAccess(user)` producing an HS256 JWT with the minimal payload and configured issuer/audience/TTL
- [x] 4.2 Add `verifyAccess(token)` that validates signature + `iss` + `aud` + `exp` and returns a typed `JwtPayload`
- [x] 4.3 Add `generateRefreshToken()` that returns a 32-byte cryptographically random base64url string plus its `sha256` hash
- [x] 4.4 Add `compareRefreshHash(rawToken, storedHash)` that uses `crypto.timingSafeEqual` on equal-length buffers
- [x] 4.5 Unit-test `TokenService`: sign/verify round-trip, tampered signature rejection, wrong `iss`/`aud` rejection, expired token rejection, refresh hash equality and constant-time semantics

## 5. Firebase Admin integration (with test fake)

- [x] 5.1 Define a DI token `FIREBASE_ADMIN` and an interface `FirebaseAdminService.verifyIdToken(token): Promise<DecodedIdToken-like>`
- [x] 5.2 Implement the real provider in `apps/api/src/auth/services/firebase-admin.service.ts` that lazily initializes a single `firebase-admin` app from env and calls `verifyIdToken(token, true)` (checkRevoked)
- [x] 5.3 Implement the fake provider in `apps/api/src/auth/services/firebase-admin.fake.ts` that accepts only `test:<uid>:<email>[:<name>]` tokens and returns a minimally shaped decoded token; rejects anything else
- [x] 5.4 In `AuthModule`, bind `FIREBASE_ADMIN` to the fake when `NODE_ENV === 'test'` and to the real service otherwise
- [x] 5.5 Unit-test both providers (real one via a mocked `firebase-admin` module; fake parses/rejects as specified)

## 6. Refresh token repository

- [x] 6.1 Create `apps/api/src/auth/repositories/refresh-token.repository.ts` with `create({ userId, familyId, tokenHash, expiresAt })`, `findActiveByHash(tokenHash)`, `findByHashIncludingRevoked(tokenHash)`, `markRevoked(id, replacedById)`, `revokeFamily(familyId)`, `deleteFamily(familyId)`, `deleteById(id)`
- [x] 6.2 Ensure all reads are index-backed and constant-time for the hash path (lookup by exact hash)
- [x] 6.3 Unit-test repository methods against a test DB or Drizzle test harness

## 7. Auth service orchestration

- [x] 7.1 Implement `AuthService.login(firebaseIdToken)`: verify via `FIREBASE_ADMIN`, `UsersService.upsertFromFirebase(...)`, start a new `family_id`, issue access token + new refresh token, persist hash, emit `auth.login.success` audit event. On Firebase failure emit `auth.login.firebase_rejected` and throw 401
- [x] 7.2 Implement `AuthService.refresh(refreshToken)`: hash input, look up row; if not found → 401; if found and `revoked_at IS NULL` → issue new pair, soft-revoke old row (`revoked_at = now()`, `replaced_by = newId`), emit `auth.refresh.rotated`; if found and `revoked_at IS NOT NULL` → hard-delete the entire family, emit `auth.refresh.reuse_detected`, throw 401; if expired → 401
- [x] 7.3 Implement `AuthService.logout(refreshToken)`: hash input, hard-delete the single row; emit `auth.logout`; respond 204 whether or not the token was recognized (no existence leak)
- [x] 7.4 Ensure no raw Firebase token, refresh token, or bearer token is ever passed to the logger
- [x] 7.5 Unit-test `AuthService` for all branches above using the fake Firebase provider

## 8. Shared auth contracts

- [x] 8.1 Create `packages/shared/src/contracts/auth.ts` with Zod `loginRequestSchema` (`{ firebaseIdToken: z.string().min(1) }`, strict), `refreshRequestSchema` (`{ refreshToken: z.string().min(1) }`, strict), `logoutRequestSchema` (`{ refreshToken: z.string().min(1) }`, strict), and `tokenPairResponseSchema` (`{ accessToken, refreshToken, accessTokenExpiresIn }`)
- [x] 8.2 Export inferred TypeScript types alongside the schemas
- [x] 8.3 Re-export the new contracts from `packages/shared/src/index.ts`

## 9. Auth controller and module

- [x] 9.1 Implement `apps/api/src/auth/controllers/auth.controller.ts` with `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`; use `nestjs-zod` pipes against the shared schemas from task 8
- [x] 9.2 Apply `@SkipAuth()` to `login` and `refresh`; keep `logout` authenticated (bearer required) so only the session owner can terminate it
- [x] 9.3 Apply strict per-route `@Throttle({ default: { limit: 10, ttl: 60_000 } })` to `login` and `refresh`
- [x] 9.4 Annotate endpoints with Swagger/OpenAPI metadata (`@ApiTags('auth')`, `@ApiBearerAuth()` where applicable, response schemas)
- [x] 9.5 Wire `AuthModule`: providers for `AuthService`, `TokenService`, `FirebaseAdminService` (bound via token + env), `RefreshTokenRepository`; register `APP_GUARD` = `JwtAuthGuard`; mark module `@Global()` so `JwtAuthGuard` deps are resolvable across the app
- [x] 9.6 Confirm `AppModule` imports `AuthModule` and that no other guard double-registers `APP_GUARD`

## 10. Users cutover to authenticated subject

- [x] 10.1 Remove `UsersService.findCurrent()` dev placeholder
- [x] 10.2 Add `UsersService.findById(id)` and `UsersService.updateById(id, input)` using the shared update schema
- [x] 10.3 Add `UsersService.upsertFromFirebase({ firebaseUid, email, displayName, avatarUrl })` using Drizzle `onConflictDoUpdate` on `firebase_uid`
- [x] 10.4 Update `UsersController.getMe` / `updateMe` to read the subject via `@CurrentUser('sub')` and delegate to `findById` / `updateById`; return 401 if the resolved user no longer exists
- [x] 10.5 Ensure the public response shape still matches the shared public user contract (no `firebaseUid` leakage)

## 11. Seed and fixtures

- [x] 11.1 Update `apps/api/src/db/seed.ts` to seed an initial user whose `firebase_uid` matches the test fake's default token (`admin-uid`)
- [x] 11.2 Update any e2e/test fixtures or helper utilities that previously relied on "first user by email asc" to use the seeded user via the fake Firebase flow (`test:admin-uid:admin@example.com`)

## 12. E2E and integration tests

- [x] 12.1 Add `apps/api/test/auth.e2e-spec.ts` covering: login success → token pair; login with invalid Firebase token → 401; refresh rotation → old token invalid, new token works; refresh reuse detection → entire family invalidated after second use of the revoked token; logout → refresh token no longer works; other sessions of same user remain valid
- [x] 12.2 Add `apps/api/test/users-me.e2e-spec.ts` covering `/users/me` GET/PATCH: unauthenticated → 401; authenticated → subject-scoped read/update; update with empty body → 400
- [x] 12.3 Add a global-guard e2e assertion: a newly added dummy endpoint without `@SkipAuth()` returns 401 when called without a bearer token
- [x] 12.4 Add an auth-throttling assertion: rapid-fire calls to `/auth/login` past the per-route limit return 429 before Firebase verification runs

## 13. Documentation, OpenAPI, and PR polish

- [ ] 13.1 Run `pnpm openapi:export` and commit the regenerated `packages/shared/openapi.json` - Blocked: `apps/api/src/openapi/export.ts` runs via `tsx --env-file=.env`, and `tsx`/esbuild does not emit usable `design:paramtypes` metadata for Nest DI. After introducing `AuthService` with a mid-list `@Inject(FIREBASE_ADMIN)` parameter, Nest resolves `ConfigService` as `undefined` during `openapi:export` boot. `nest build`, unit tests, and e2e tests are unaffected because they go through SWC (`apps/api/.swcrc` has `decoratorMetadata: true`). - Follow-up: switch `openapi:export` off `tsx` (e.g. run against the SWC/`dist` build, or use a loader that preserves decorator metadata). Track as a separate tooling change; do not block this auth change on it.
- [x] 13.2 Update `apps/api/AGENTS.md` only if env-var ownership text or required-steps text needs refinement for the new variables (do not duplicate information)
- [x] 13.3 Update `bruno/` local environment collection with example `/auth/login`, `/auth/refresh`, `/auth/logout` requests using the test fake token
- [ ] 13.4 Run and pass `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` from the repo root - `pnpm lint` — pass - `pnpm test` — pass (`@gitiempo/api` 51/51) - `pnpm --filter @gitiempo/api test:e2e` — pass (22/22) - `pnpm typecheck` — blocked by a pre-existing, unrelated TS6 deprecation in `apps/user-web/tsconfig.app.json` and `apps/admin-web/tsconfig.app.json` (`Option 'baseUrl' is deprecated ... specify "ignoreDeprecations": "6.0"`). Not caused by this change; tracked as a separate frontend tooling fix.
- [ ] 13.5 Final sanity check: `pnpm openspec status --change "add-firebase-jwt-auth"` shows all artifacts done and all tasks checked - Artifacts: complete (`4/4`, proposal/design/specs/tasks). - Tasks: 13.1 and 13.4 intentionally left unchecked above with documented follow-ups; not blockers for this change.

## 14. Frontend UI pixel-alignment fixes

- Scope note: an agent MAY execute only section `14` when the user request is explicitly limited to frontend/UI work for this change. In that mode, backend sections `1` through `13` do not need to be modified unless the frontend task reveals a concrete shared-contract or API dependency.

- [x] 14.1 LoginView: Fix hero heading to exactly 40px fontSize with no letter-spacing override
- [x] 14.2 LoginView: Fix brand subtitle, field labels, hero card body, and `Forgot?` text to 13px fontSize
- [x] 14.3 LoginView: Fix hero card titles to 16px fontSize and card cornerRadius to 10px (`radius-lg`)
- [x] 14.4 LoginView: Fix `Sign in` heading to 28px and button text to 15px fontSize
- [x] 14.5 LoginView: Fix input height to 42px and all input/button cornerRadius to 6px (`radius-sm`)
- [x] 14.6 LoginView: Move `Forgot?` inside the password input field and right-align it to match the approved design
- [x] 14.7 LoginView: Fix sign-in panel gap to 20px and padding to 24px; fix right panel vertical padding to 48px at desktop
- [x] 14.8 AppShell header: Fix logo to 32x32 with 10px radius, `GT` to 12px, and brand name to 16px
- [x] 14.9 AppShell header: Replace generic signed-in copy with the actual user display name and avatar initials
- [x] 14.10 AppShell sidebar: Fix container padding to 16px top/bottom and align nav item spacing with the documented shell rules
- [x] 14.11 AppShell sidebar: Add the missing `Projects` nav item while keeping the documented icon-based navigation treatment
- [x] 14.12 AppShell sidebar: Remove the sign-out action from the sidebar
- [x] 14.13 ProfileView: Add the destructive outlined `Sign out` button at the bottom of the profile content area, right-aligned to match the approved design

## 15. Frontend tooling deprecation cleanup

- [ ] 15.1 Remove deprecated TypeScript `baseUrl` usage from `apps/user-web/tsconfig.app.json` and `apps/admin-web/tsconfig.app.json`, keeping the existing `@/*` alias working through non-deprecated configuration only
- [ ] 15.2 Remove `ignoreDeprecations` entries that were only suppressing the deprecated frontend config once the non-deprecated configuration is in place
- [ ] 15.3 Verify frontend tooling still resolves the `@/*` alias correctly in `user-web` and `admin-web` without deprecated TypeScript config
- [ ] 15.4 Run and pass `pnpm --filter user-web typecheck`, `pnpm --filter admin-web typecheck`, and `pnpm typecheck` after the migration
