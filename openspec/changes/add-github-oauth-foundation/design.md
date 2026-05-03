## Context

`apps/api` is a NestJS backend using Drizzle ORM, PostgreSQL, Zod-backed DTOs, and OpenAPI export. Application authentication already uses Firebase identity plus backend-issued JWT access tokens and opaque hashed refresh tokens.

GitHub integration is documented as an optional per-user GitHub App user-to-server OAuth connection. The API currently has provider-neutral project/task external reference tables and a local `start-from-github` timer flow, but it does not yet have GitHub OAuth connection storage, token encryption, or token refresh.

GitHub's web application flow starts at `https://github.com/login/oauth/authorize` with `client_id`, `redirect_uri`, `state`, and PKCE parameters. The backend exchanges callback codes and refreshes user access tokens through `POST https://github.com/login/oauth/access_token`. GitHub user access tokens use the `ghu_` prefix and usually expire after `28800` seconds; refresh tokens use the `ghr_` prefix and usually expire after `15897600` seconds.

Affected areas are `apps/api` for backend endpoints, persistence, env validation, and OpenAPI, plus `packages/shared` for public response/request contracts.

## Goals / Non-Goals

**Goals:**

- Add foundation-only GitHub OAuth endpoints: connection status, auth URL generation, OAuth callback handling, and disconnect.
- Persist GitHub connection metadata and encrypted token material per application user.
- Persist server-side OAuth state with PKCE verifier material, expiry, and one-time consumption.
- Provide an internal service that returns a valid GitHub user access token and refreshes expired tokens safely.
- Keep callback redirects safe and deterministic by always returning to `USER_SPA_URL/profile`.
- Add shared contracts for public GitHub foundation endpoint shapes.

**Non-Goals:**

- Do not implement GitHub organizations, repositories, projects, issues, or task selector data endpoints.
- Do not implement `POST /projects/:id/tasks/sync` or a full task sync adapter in this change.
- Do not require the existing `time-entries/timer/start-from-github` endpoint to call GitHub APIs or require a connected GitHub account.
- Do not replace existing Firebase/JWT application authentication.
- Do not introduce background jobs, webhooks, or provider polling.

## Decisions

### Dedicated GitHub API module

Create a dedicated GitHub backend module under `apps/api/src/github` with controller, services, DTOs, and persistence helpers. This keeps provider authentication separate from core auth, projects, tasks, and time tracking.

Alternative considered: add OAuth behavior directly to existing auth or time-entry modules. That would make GitHub an application-auth concern or timer concern, even though GitHub is an optional external provider connection.

### Server-side OAuth state with PKCE

Use a `github_oauth_states` table for an unguessable opaque state id, user ownership, PKCE verifier, expiry, and one-time consumption. The `state` parameter MUST map to this server-side row and MUST NOT be a self-contained signed JWT containing userId and nonce. Callback handling MUST atomically claim the state before exchanging the authorization code, rejecting missing, expired, already-consumed, or mismatched state.

The claim operation should be a single database write with a predicate equivalent to `UPDATE github_oauth_states SET consumed_at = now() WHERE state = ... AND consumed_at IS NULL AND expires_at > now() RETURNING *`. The key property is that state is not merely checked and then consumed later; it is captured atomically so concurrent callbacks cannot both pass validation.

Alternative considered: self-contained signed JWT state with userId and nonce. It is simpler, but it exposes more state to the browser and does not provide the same server-side PKCE, expiry, and replay controls.

### Encrypted token persistence

Add a `github_connections` table keyed by `user_id` and store GitHub user identity, login, avatar URL, connection status, access token expiry, refresh token expiry, and encrypted token material. Token values MUST be encrypted before persistence and MUST never be returned through public API responses.

Use AES-256-GCM with a validated 32-byte `ENCRYPTION_KEY`. Store encrypted values in a versioned envelope format so future key rotation or format changes are possible.

Alternative considered: hashing GitHub tokens like application refresh tokens. Hashing cannot work because the backend must later present the GitHub access or refresh token to GitHub.

### Internal valid-token service

Expose an internal `getValidAccessToken(userId)`-style service for future GitHub data endpoints. It loads the user's connected row, decrypts and returns a still-valid access token, or refreshes the token set with GitHub when the access token is expired or near expiry.

Refreshing should be concurrency-safe. Prefer optimistic compare-and-swap semantics based on the row's previous refresh token state or `updated_at`; if another request already refreshed the row, reread and use the newer token rather than overwriting it.

Alternative considered: hold a database lock while calling GitHub. That avoids races but risks long transactions around external network calls.

### Soft disconnect

Disconnect should mark the connection disconnected and clear encrypted access/refresh token material while preserving GitHub identity metadata and timestamps. Future reconnect can update the same row.

Alternative considered: hard delete the connection row. Hard delete is simpler but loses useful connection history and makes status transitions less explicit.

### Safe callback redirects

The callback endpoint is public because GitHub redirects a browser without the GiTiempo JWT. User identity must come only from validated OAuth state. Success and failure callbacks MUST always redirect to `USER_SPA_URL/profile`, with safe status/error codes rather than raw provider errors.

Alternative considered: support caller-selected return targets for User SPA and Admin SPA. The foundation keeps a single fixed destination to avoid open redirect complexity and keep the first integration point predictable.

### Environment validation matrix

GitHub configuration must not make local development brittle, but production must not start with an unusable or insecure OAuth setup.

| `NODE_ENV` | GitHub credentials | `ENCRYPTION_KEY` | Runtime behavior |
| --- | --- | --- | --- |
| `production` | Required | Required, valid 32-byte key | Startup fails if missing or invalid |
| `test` | Optional | Optional deterministic test default allowed only for unit tests | Tests can run without real GitHub credentials |
| `development` | Optional | Optional until GitHub endpoints are used | GitHub endpoints return a controlled configuration error when required values are missing |

This means env validation should validate shape when values are present in all environments, but only hard-require GitHub credentials and encryption key at startup in production. Non-production endpoints must fail closed with a clear application error instead of silently attempting OAuth with missing config.

## Risks / Trade-offs

- Encrypted token storage depends on `ENCRYPTION_KEY` availability and durability -> require it in production, allow test-only defaults only in tests, and document that losing it requires users to reconnect GitHub.
- Token refresh can race under concurrent GitHub API requests -> use optimistic update/reread behavior and avoid long DB transactions around network calls.
- OAuth state rows can accumulate -> expire state quickly and include a cleanup path or query filter that treats expired rows as invalid.
- Soft-disconnected rows remain in storage -> all token access paths must require `connected = true` and non-null token material.
- Callback failures can leak provider details -> redirect to `USER_SPA_URL/profile` with stable internal error codes and log sanitized provider details server-side only.
- `start-from-github` remains local-only in this change -> document this as intentional so future GitHub enforcement is a separate scoped change.

## Migration Plan

1. Add shared contracts first so API DTOs can wrap them.
2. Add Drizzle schemas and migrations for `github_connections` and `github_oauth_states`.
3. Wire env validation according to the `NODE_ENV` matrix for GitHub App credentials, encryption key, and `USER_SPA_URL`.
4. Add GitHub module endpoints and internal token service.
5. Export OpenAPI after DTO/controller changes.

Rollback should remove the GitHub module routes and only drop GitHub tables if stored token data is intentionally discarded. In production, prefer disconnecting/clearing token material before table removal.

## Open Questions

- Should `ENCRYPTION_KEY` rotation be handled in this change, or deferred with the versioned encrypted envelope as preparation?
