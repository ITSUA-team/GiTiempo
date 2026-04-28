# ADR 002: JWT Token-Based Authentication

**Status:** Approved  
**Date:** 2025-01-15

## Context

The application has three clients (User SPA, Admin SPA, Chrome Extension) hosted on different origins:
- SPAs on Cloudflare Pages (`app.tiempo.com`, `admin.tiempo.com`)
- API on VPS (`api.tiempo.com`)
- Chrome Extension running on `github.com`

Session cookies cannot be shared across these origins without complex workarounds (SameSite, domain scoping). The Chrome Extension (Manifest V3 content script) has no access to cookies from the application domain.

## Decision

Use **JWT access/refresh token pair** instead of session cookies:

1. Frontend authenticates user via Firebase Auth (Google SSO or email/password).
2. Frontend sends Firebase ID token to `POST /auth/login`.
3. Backend verifies the Firebase ID token, requires an existing local user with active workspace membership, and returns a short-lived JWT access token (15 min) and a long-lived refresh token (7 days).
4. All API requests include the access token in `Authorization: Bearer <token>` header.
5. When the access token expires, the frontend calls `POST /auth/refresh` with the refresh token to obtain a new pair.
6. Refresh tokens are rotated on each use (old token invalidated).

Backend configures CORS via `ALLOWED_ORIGINS` environment variable.

## Consequences

- All three clients use the same auth mechanism — no special handling per client
- Chrome Extension stores tokens in `chrome.storage` and works without cookies
- Stateless verification on the backend (JWT signature check) — no session store needed
- CORS is straightforward — just whitelist origins in env config
- Refresh token rotation mitigates token theft risk
- Token revocation is eventual (access token valid until expiry) — acceptable for MVP
- Requires frontend token refresh logic (interceptor on 401 responses)
