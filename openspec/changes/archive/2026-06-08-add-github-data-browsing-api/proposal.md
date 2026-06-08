## Why

GitHub OAuth is already available, but authenticated users cannot browse their connected GitHub account data from the GiTiempo API. The future task selector needs backend-owned, token-safe endpoints for personal and organization repositories, projects, and issues without exposing GitHub tokens to the frontend.

## What Changes

- Add backend-only GitHub browsing endpoints for connected users to list GitHub owners, repositories, Projects V2, repository issues, and Project V2 issue items.
- Support both personal and organization scopes through explicit query parameters so a future frontend can switch between personal and organization browsing.
- Expose unified `pageToken` pagination from the GiTiempo API while hiding GitHub REST page numbers and GraphQL cursors inside the backend.
- Support issue search in repository and Project V2 issue browsing endpoints as part of P0.
- Normalize GitHub REST and GraphQL responses into stable shared response contracts instead of returning raw provider payloads.
- Use the existing encrypted GitHub OAuth connection and internal valid-token service for all GitHub API access.
- Keep browsing read-only: do not create local projects, create local tasks, sync issues, or change `start-from-github` timer behavior in this change.

## Capabilities

### New Capabilities

- `github-data-browsing-api`: Backend GitHub browsing behavior for connected users, including owners, repositories, Projects V2, repository issues, and Project V2 issue items.

### Modified Capabilities

- `contracts`: Add shared GitHub browsing query and response contracts for backend DTOs, OpenAPI output, and future frontend clients.

## Impact

- `packages/shared/src/contracts/github.ts` for shared GitHub browsing schemas and types.
- `packages/shared/src/contracts/*.spec.ts` for focused contract validation coverage.
- `apps/api/src/github` for DTOs, controller routes, service orchestration, and GitHub REST/GraphQL client behavior.
- `packages/shared/openapi.json` after API DTO/controller changes.
- No frontend UI implementation, no database migration, and no local project/task sync behavior in this change.
