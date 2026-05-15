## Context

`apps/api` already contains a dedicated GitHub module for GitHub App user-to-server OAuth. The existing foundation stores GitHub token material encrypted, exposes safe connection/auth URL endpoints, and provides an internal `getValidAccessToken(userId)` path that refreshes tokens when needed. The current non-goal of that archived foundation was to avoid organizations, repositories, projects, and issue browsing.

This change adds the next backend-only layer: read-only GitHub data browsing endpoints for future task selection. It affects `apps/api` and `packages/shared`; it does not add user-web UI, admin-web UI, database tables, migrations, background sync, or local project/task creation.

Relevant instructions:

- Root `AGENTS.md`: backend, NestJS, Drizzle, and OpenAPI work should follow `apps/api/AGENTS.md`; shared contracts live in `packages/shared`.
- `apps/api/AGENTS.md`: API routes should use shared Zod contracts, `nestjs-zod` DTOs, controller/service separation, and OpenAPI export.
- `openspec/config.yaml`: group planned work by package/app and include verification for each touched area.

Planned file groups:

- `packages/shared`: extend `contracts/github.ts` with browsing query/response schemas and add focused contract tests.
- `apps/api`: add GitHub browsing DTOs, service orchestration, REST/GraphQL provider client helpers, controller routes, and unit tests.
- `packages/shared/openapi.json`: regenerate after API DTO/controller changes.

## Goals / Non-Goals

**Goals:**

- Add authenticated backend endpoints that let a connected user browse GitHub owners, repositories, Projects V2, repository issues, and Project V2 issue items.
- Support future frontend switching between personal and organization browsing through explicit query parameters.
- Keep GitHub tokens server-side and expose only normalized, stable GiTiempo contracts.
- Include Project V2 issue item browsing in this change because it is important for selecting tasks from GitHub Projects.
- Preserve current local time tracking and `start-from-github` behavior.

**Non-Goals:**

- No user-web task selector UI in this backend-only change.
- No admin-web changes.
- No local project/task creation from browsing responses.
- No issue sync, webhook ingestion, background polling, or `POST /projects/:id/tasks/sync` behavior.
- No GitHub write operations.
- No new database tables or migrations.
- No new Octokit dependency unless implementation proves direct `fetch` insufficient.

## Decisions

### Route model uses owner query parameters for personal and organization scopes

Expose browsing through normalized backend routes:

- `GET /github/owners?type=all|personal|organization`
- `GET /github/repos?ownerType=personal|organization&owner=<login>&pageToken=<token>&limit=<limit>`
- `GET /github/projects?ownerType=personal|organization&owner=<login>&pageToken=<token>&limit=<limit>`
- `GET /github/repos/:owner/:repo/issues?state=open|closed|all&q=<search>&pageToken=<token>&limit=<limit>`
- `GET /github/projects/:projectId/issues?state=open|closed|all&q=<search>&pageToken=<token>&limit=<limit>`

For `ownerType=personal`, the backend derives the owner from the connected GitHub account login and does not become an arbitrary public GitHub browser. For `ownerType=organization`, `owner` is required and is treated as the GitHub organization login.

Alternative considered: keep only `/github/orgs/:org/...` routes from the draft. That shape does not model personal repositories/projects cleanly and would make the future UI switcher awkward.

### Use existing GitHub connection token flow

Every browsing endpoint uses the authenticated application user and the existing GitHub connection service to obtain a valid GitHub user access token. Endpoints fail closed when the user has no usable connected GitHub account.

Alternative considered: accept GitHub tokens from the frontend. That would expose provider token material outside the backend and conflict with the OAuth foundation design.

### REST for owners, repositories, Projects V2 list/get, and repository issues

Use GitHub REST endpoints where the data maps directly:

- current user metadata for the personal owner
- user organizations for organization owners
- user or organization repositories
- user or organization Projects V2 lists
- repository issues

Repository issue responses must filter out pull requests because GitHub's repository issues endpoint includes pull requests in the same collection. When `q` is present, repository issue browsing may use GitHub issue search constrained to the requested repository and `is:issue`; when `q` is omitted, it can use the repository issues list endpoint.

Repository issue state defaults to `all` when omitted so future task selection can find both open and closed GitHub work unless the caller narrows the state.

Alternative considered: use GraphQL for every GitHub read. That gives one provider style but increases query complexity for simple list endpoints and is not needed for P0.

### GraphQL for Project V2 issue items

Use GitHub GraphQL `node(id: $projectId) { ... on ProjectV2 { items(first, after) { ... } } }` for `GET /github/projects/:projectId/issues`. The `projectId` path value is the Project V2 node id returned by the projects list endpoint.

The query should select only minimal issue fields needed by the future task selector: project item id/type/archive state, issue id, repository owner/name/nameWithOwner, number, title, state, URL, and updated time. Non-issue items are skipped and counted: pull requests, draft issues, redacted items, and unknown content.

Project issue state defaults to `all` when omitted. When `q` is present, Project V2 issue browsing should pass the search text through the provider-supported Project V2 item query where possible and still return only real issue items after normalization.

Alternative considered: use REST project item view endpoints. Current docs show view-oriented project item routes with token support limitations, so GraphQL is clearer and more reliable for Project V2 issue content.

### Return normalized contracts, not raw GitHub payloads

Shared contracts should expose stable GiTiempo names and string identifiers. Numeric GitHub ids that may exceed JavaScript-safe integer constraints should be represented as strings or omitted in favor of node ids.

For project issue items, the response should include `skipped` counts so clients can explain why a Project V2 item total may not equal returned issue count.

Alternative considered: return provider payloads directly. That would couple frontend/API consumers to GitHub response details and make OpenAPI output noisy and unstable.

### Expose unified page-token pagination

All GitHub browsing endpoints expose the same pagination shape to API consumers: bounded `limit`, optional `pageToken`, `hasNextPage`, and nullable `nextPageToken`. Provider-specific pagination remains hidden inside the backend.

For GitHub REST reads, `pageToken` can encode the next REST page number or provider pagination state. For GitHub GraphQL and Projects V2 reads, `pageToken` can encode the provider cursor. The token is opaque to clients and MUST NOT be parsed or generated by callers.

Alternative considered: expose numbered `page` for REST and `after` cursors for Projects V2. That would leak provider differences into the frontend and make a future task selector more complex. Another alternative was true numbered pages everywhere, but that would require backend cursor caching for Projects V2 and is too much P0 complexity.

## Risks / Trade-offs

- GitHub GraphQL can return errors with HTTP 200 -> inspect `errors` and map provider failures to safe backend errors.
- GitHub Project V2 items can be pull requests, draft issues, redacted, or null -> normalize only true issues and include skipped counts.
- A user may see a project but not every linked repository issue -> tolerate redacted/null content without failing the entire response.
- Repository issues endpoint includes pull requests -> filter PR payloads before contract validation and add tests.
- GitHub rate limits or query costs can affect browsing -> cap `limit` to 100, request minimal fields, and avoid auto-fetching all pages.
- Opaque `pageToken` values can become stale if GitHub data changes between requests -> treat invalid tokens as safe validation/provider errors and require clients to restart pagination from the first page.
- Issue search can use different GitHub provider paths than plain listing -> normalize both paths to the same shared response shape and cover both with tests.
- Direct `fetch` keeps dependencies small but requires manual error/pagination handling -> centralize GitHub REST/GraphQL request helpers and test provider error normalization.
- Personal owner semantics could accidentally become arbitrary GitHub browsing -> derive personal owner from the connected account and require explicit organization owners for org scope.

## Migration Plan

1. Add shared GitHub browsing contracts and tests.
2. Add API DTOs and backend GitHub data client/service methods behind existing authentication.
3. Add controller routes and unit tests for route delegation, authorization, response normalization, pagination, and provider failures.
4. Regenerate OpenAPI.
5. Run shared and API verification.

Rollback is route-level and contract-level only because no persistence is added. Remove the new GitHub browsing routes and shared schemas if the change needs to be backed out; stored GitHub OAuth data remains unchanged.

## Resolved Decisions

- Repository issue browsing defaults to `state=all` when omitted.
- Project V2 issue browsing defaults to `state=all` when omitted.
- Issue search for repository and Project V2 issue browsing is included in P0.
