# ADR 003: GitHub App with User-to-Server Authentication

**Status:** Approved  
**Date:** 2025-01-15

## Context

The application needs to access GitHub data (organizations, projects, repositories, issues) on behalf of individual users. Two main options exist:

1. **GitHub OAuth App** — simpler setup, but tokens don't expire (security risk), and scopes are coarse-grained.
2. **GitHub App (user-to-server)** — more setup, but tokens expire (8h access, 6mo refresh), fine-grained permissions, no organization-level installation required.

## Decision

Use a **GitHub App** with **user-to-server authentication** flow:

- Users connect their GitHub account in profile settings via OAuth web flow.
- The backend receives a short-lived user access token (`ghu_`, 8h) and a refresh token (`ghr_`, 6mo).
- Tokens are AES-encrypted at rest in the `GitHubConnection` table.
- Access tokens are refreshed automatically when expired.
- No organization-level GitHub App installation is required — the app accesses only what the user's GitHub account can see.

## Consequences

- Follows GitHub's recommended security practice for token rotation
- Fine-grained permissions (only request what's needed: read issues, read projects)
- Each user sees only their own GitHub data — no shared org-level token
- Token refresh adds backend complexity (must handle refresh failures, revocations)
- If a refresh token expires (6 months of inactivity), the user must reconnect manually
- GitHub connection is fully optional — users can work with manual tasks without it
