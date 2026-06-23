# ADR 003: GitHub App with User-to-Server Authentication

**Status:** Approved  
**Date:** 2025-01-15

## Context

The application needs to access GitHub data (organizations, projects, repositories, issues) on behalf of individual users. Two main options exist:

1. **GitHub OAuth App** — simpler setup, but tokens don't expire (security risk), and scopes are coarse-grained.
2. **GitHub App (user-to-server)** — more setup, but tokens expire (8h access, 6mo refresh), fine-grained permissions, and user-scoped access without a shared organization token model.

## Decision

Use a **GitHub App** with **user-to-server authentication** flow:

- Users connect their GitHub account in profile settings via OAuth web flow.
- The backend receives a short-lived user access token (`ghu_`, 8h) and a refresh token (`ghr_`, 6mo).
- Tokens are AES-encrypted at rest in the `GitHubConnection` table.
- Access tokens are refreshed automatically when expired.
- The app accesses only what the connected user's GitHub account can see; GiTiempo does not introduce a shared organization token or workspace-level GitHub credential.
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
