## 1. Shared Contracts

- [x] 1.1 Add `packages/shared/src/contracts/github.ts` with a GitHub connection status discriminated union: `{ status: "disconnected", account: null }` or `{ status: "connected", account: { githubUserId, login, avatarUrl, connectedAt, updatedAt } }`.
- [x] 1.2 Add the GitHub auth URL response schema as `{ authorizationUrl: string }`.
- [x] 1.3 Export GitHub contracts from `packages/shared/src/index.ts`.

## 2. Database Schema And Migration

- [x] 2.1 Add `github_connections` Drizzle schema with one row per user, GitHub account metadata, connected state, encrypted token fields, access token expiry, refresh token expiry, and timestamps.
- [x] 2.2 Add `github_oauth_states` Drizzle schema with an unguessable opaque state identifier, user ownership, PKCE verifier material, expiry, consumed timestamp, and timestamps.
- [x] 2.3 Re-export GitHub schemas from `apps/api/src/db/schema.ts`.
- [x] 2.4 Generate a Drizzle migration for the new GitHub tables and indexes.
- [x] 2.5 Review generated migration SQL for uniqueness, foreign keys, expiry lookup indexes, and safe cascade behavior.

## 3. Environment And Configuration

- [x] 3.1 Add env validation for `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, and `GITHUB_APP_CLIENT_SECRET` that requires them in production and validates shape when present in non-production.
- [x] 3.2 Add env validation for `USER_SPA_URL` and use `USER_SPA_URL/profile` as the only OAuth callback redirect destination.
- [x] 3.3 Add env validation for a 32-byte `ENCRYPTION_KEY` suitable for AES-256-GCM, required in production.
- [x] 3.4 Keep test-mode behavior hermetic by allowing GitHub credentials to be absent and allowing a deterministic encryption key default only for unit tests.
- [x] 3.5 In development, allow missing GitHub config at startup but make GitHub endpoints return controlled configuration errors when required values are absent.
- [x] 3.6 Update `.env.example` comments if required values or encoding expectations change.

## 4. Crypto And GitHub OAuth Client

- [x] 4.1 Add a small AES-256-GCM encryption/decryption helper with a versioned ciphertext envelope.
- [x] 4.2 Add unit tests for encryption round trips, wrong-key failures, and tampered ciphertext failures.
- [x] 4.3 Add a GitHub OAuth client for authorization code exchange, refresh token exchange, and current GitHub user lookup.
- [x] 4.4 Ensure OAuth client errors are mapped to safe application errors without logging token material.
- [x] 4.5 Add unit tests for OAuth client request payloads and sanitized error handling.

## 5. OAuth State Flow

- [x] 5.1 Implement PKCE verifier and challenge generation.
- [x] 5.2 Implement OAuth state creation with an unguessable opaque state id, user binding, expiry, and PKCE verifier storage.
- [x] 5.3 Implement atomic one-time OAuth state consumption with a single database claim operation equivalent to `UPDATE ... WHERE state = ... AND consumed_at IS NULL AND expires_at > now() RETURNING *`.
- [x] 5.4 Ensure atomic consumption rejects missing, expired, already-consumed, or mismatched state before any GitHub code exchange.
- [x] 5.5 Add tests for opaque state creation, atomic claim success, expiry rejection, replay rejection, concurrent callback rejection, user binding behavior, and rejection of self-contained state JWT assumptions.

## 6. GitHub Connection And Token Services

- [x] 6.1 Implement connection lookup and status mapping for connected and disconnected users.
- [x] 6.2 Implement connection upsert after successful OAuth callback, encrypting access and refresh token values before persistence.
- [x] 6.3 Implement disconnect by marking the connection disconnected and clearing encrypted token material.
- [x] 6.4 Implement an internal valid-token service that returns a non-expired decrypted GitHub access token for connected users.
- [x] 6.5 Implement token refresh for expired or near-expired access tokens and persist refreshed encrypted token values.
- [x] 6.6 Add optimistic refresh race handling so concurrent refresh attempts do not overwrite newer token state.
- [x] 6.7 Add unit tests for status mapping, upsert, disconnect, refresh success, refresh failure, and refresh race behavior.

## 7. API Module And Endpoints

- [x] 7.1 Add a GitHub API module and import it from `AppModule`.
- [x] 7.2 Add DTOs wrapping the shared GitHub contracts with `createZodDto`.
- [x] 7.3 Add `GET /github/connection` for authenticated connection status.
- [x] 7.4 Add `GET /github/auth-url` for authenticated OAuth URL creation.
- [x] 7.5 Add public `GET /github/callback` for GitHub OAuth callback completion.
- [x] 7.6 Add `DELETE /github/connection` for authenticated disconnect.
- [x] 7.7 Add Swagger decorators and Zod serializers for the new public response shapes.

## 8. Callback Redirect Behavior

- [x] 8.1 Redirect successful callbacks only to `USER_SPA_URL/profile` with safe success indicators.
- [x] 8.2 Redirect failed callbacks only to `USER_SPA_URL/profile` with safe error codes.
- [x] 8.3 Do not accept or reflect caller-provided redirect targets in OAuth callback redirects.
- [x] 8.4 Add tests for successful callback redirects, failed callback redirects, and ignored external redirect targets.

## 9. Controller And Integration Tests

- [x] 9.1 Add controller tests for authenticated status, auth URL, and disconnect routes.
- [x] 9.2 Add callback tests for valid callback, missing state, expired state, replayed state, and GitHub token exchange failure.
- [x] 9.3 Add tests proving API responses never include encrypted or raw token material.
- [x] 9.4 Confirm focused e2e coverage is not applicable without adding GitHub HTTP mocking to the existing real-DB e2e setup.

## 10. OpenAPI And Verification

- [x] 10.1 Run `pnpm --filter @gitiempo/shared build` before direct filtered API verification if needed.
- [x] 10.2 Run `pnpm --filter @gitiempo/api lint`.
- [x] 10.3 Run `pnpm --filter @gitiempo/api typecheck`.
- [x] 10.4 Run `pnpm --filter @gitiempo/api test`.
- [x] 10.5 Skip API e2e tests by user request because applying pending migrations to the configured database was not approved.
- [x] 10.6 Run the build-based OpenAPI export and update `packages/shared/openapi.json`.
- [x] 10.7 Confirm the OpenSpec requirements for `github-oauth-foundation`, `data-model`, and `contracts` are satisfied.
