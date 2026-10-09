# ADR 003: GitHub App with User-to-Server Authentication

**Status:** Superseded by [ADR 009](009-workspace-github-app-installation-tracking.md) for GitHub-backed timer starts; retained for personal browsing and import.
**Date:** 2025-01-15

## Context

The application needs to access private GitHub data (projects, repositories, issues) on behalf of individual users. Two main options exist:

1. **GitHub OAuth App** — scopes are coarse-grained; token expiry and refresh metadata depend on the issuing configuration. It serves identity and organization discovery.
2. **GitHub App (user-to-server)** — more setup, but tokens expire (8h access, 6mo refresh), fine-grained permissions, and user-scoped access without a shared organization token model.

## Identity and organization discovery update — 2026-10-08

The existing sign-in OAuth App now also links an account from Profile and discovers organizations before installation. Both entry points request `user:email read:org read:project`, without `repo`; granted scopes and optional expiry metadata determine each capability. GitHub numeric ID owns one global GiTiempo identity link. OAuth and personal App tokens have separate encrypted stores. Missing OAuth permissions allow a valid login and do not disable App-backed Projects.

Full personal Disconnect verifies an enabled Firebase account with password or Google sign-in, removes identity ownership and both personal grants, invalidates older authorization transactions, and attempts bounded token-specific revocation. Current GiTiempo sessions, workspace installations, policy, imported records and history survive. Provider revocation failure is reported after authoritative local unlink.

## Decision

Use a **GitHub App** with **user-to-server authentication** flow:

- Users authorize personal GitHub App data access separately in Profile after linking the same GitHub identity through OAuth.
- The backend receives a short-lived user access token (`ghu_`, 8h) and a refresh token (`ghr_`, 6mo).
- Tokens are AES-encrypted at rest in the `GitHubConnection` table.
- Access tokens are refreshed automatically when expired.
- The app accesses only what the connected user's GitHub account can see for personal browsing and import. ADR 009 adds a separate workspace GitHub App installation credential for GitHub-backed timer starts.
- Workspace admins may apply an additional GiTiempo workspace policy that allow-lists which GitHub organizations are surfaced inside the product, but that policy is a filter and does not grant access by itself.

## Consequences

- Follows GitHub's recommended security practice for token rotation
- Fine-grained permissions (only request what's needed: read issues, read projects)
- Each user sees only their own GitHub data — no shared org-level token
- Workspace-level GitHub organization policy is an additional product filter, not an auth-model change
- Token refresh adds backend complexity (must handle refresh failures, revocations)
- If a refresh token expires (6 months of inactivity), the user must reconnect manually
- GitHub connection is fully optional — users can work with manual tasks without it
- Some private organization resources can still require GitHub-side GitHub App approval or installation even when the organization login itself validates successfully
