## 1. Shared Contracts

- [x] 1.1 Add GitHub owner type, owner scope, issue state, and unified page-token pagination schemas in `packages/shared/src/contracts/github.ts`.
- [x] 1.2 Add GitHub owner list query and response schemas with personal and organization owner support.
- [x] 1.3 Add GitHub repository list query and response schemas with bounded `limit` and optional opaque `pageToken`.
- [x] 1.4 Add GitHub Project V2 list query and response schemas with bounded `limit` and optional opaque `pageToken`.
- [x] 1.5 Add GitHub repository issue and Project V2 issue item query/response schemas, including default `state=all`, optional search, and skipped item counts for project issue browsing.
- [x] 1.6 Add focused shared contract tests for valid browsing payloads, invalid owner types, invalid issue states, default issue state, search fields, bounded pagination, and token-secret exclusion.

## 2. API DTOs And Routes

- [x] 2.1 Add `nestjs-zod` DTOs in `apps/api/src/github/dto` for the new GitHub browsing queries and responses.
- [x] 2.2 Add controller routes for `GET /github/owners`, `GET /github/repos`, `GET /github/projects`, `GET /github/repos/:owner/:repo/issues`, and `GET /github/projects/:projectId/issues`.
- [x] 2.3 Ensure personal owner requests derive the GitHub owner from the connected account and organization requests require an owner login.
- [x] 2.4 Ensure every browsing route uses authenticated app user context and never accepts GitHub token material from the request.

## 3. GitHub Provider Client And Normalization

- [x] 3.1 Add a focused GitHub data client/service helper for authenticated REST requests with GitHub headers, safe provider error mapping, and provider pagination conversion to opaque GiTiempo page tokens.
- [x] 3.2 Add a GraphQL request helper that treats GraphQL `errors` as provider failures even when GitHub returns HTTP 200.
- [x] 3.3 Implement owner, repository, Project V2, and repository issue provider reads using the existing valid-token GitHub connection path and unified page-token pagination.
- [x] 3.4 Implement repository issue search with default `state=all` while preserving the same normalized response shape as repository issue listing.
- [x] 3.5 Implement Project V2 issue item browsing through GraphQL `ProjectV2.items` using the project node id returned by project list responses, unified page-token pagination, default `state=all`, and optional search.
- [x] 3.6 Normalize provider responses into shared contracts, filter pull requests from repository issue results, and skip/count non-issue Project V2 items.
- [x] 3.7 Keep browsing read-only by avoiding local project, task, time-entry, sync, or timer mutations.

## 4. API Tests

- [x] 4.1 Add controller tests proving each new route delegates with the authenticated user and validated query/path inputs.
- [x] 4.2 Add service/client tests for disconnected-user failures that do not call GitHub provider APIs.
- [x] 4.3 Add REST normalization tests for owner, repository, project, and repository issue responses, including pull request filtering, default `state=all`, search, and page-token pagination.
- [x] 4.4 Add GraphQL normalization tests for Project V2 issue items, skipped pull request/draft/redacted counts, default `state=all`, search, page-token pagination, and GraphQL error handling.
- [x] 4.5 Add tests proving provider errors are mapped safely without leaking tokens or raw provider secrets.

## 5. OpenAPI And Verification

- [x] 5.1 Regenerate `packages/shared/openapi.json` after DTO/controller changes.
- [x] 5.2 Run `pnpm --filter @gitiempo/shared build` if needed by downstream API validation.
- [x] 5.3 Run `pnpm --filter @gitiempo/shared test`.
- [x] 5.4 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- [x] 5.5 Run the applicable OpenAPI export workflow and confirm the new GitHub browsing endpoints and schemas are represented.
