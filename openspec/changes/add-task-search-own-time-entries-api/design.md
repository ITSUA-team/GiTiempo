## Context

`GET /time-entries` already returns the authenticated user's own time entries with server-side pagination, exact filters, and descending time ordering. The list query contract lives in `packages/shared/src/contracts/time-entries.ts`, the Nest DTO wraps that shared Zod schema, and `TimeEntriesService.buildListConditions()` feeds both the data query and the `count()` query used for pagination metadata.

The approved GitHub issue asks for task-title search against the full result set. Existing UI documentation described the Time Entries task lookup as selected-`taskId` filtering only; this change accepts the issue as the newer product decision and updates API/docs behavior accordingly.

## Goals / Non-Goals

**Goals:**

- Add an optional `search` query parameter to the shared time-entry list query contract.
- Apply `search` as a case-insensitive partial match against task titles.
- Compose `search` with existing pagination, date, project, and task filters.
- Keep ownership, workspace scoping, visibility checks, response shape, and list ordering unchanged.
- Keep pagination metadata correct under filtered result sets.
- Document that the shared query schema can expose the same search behavior on project time-entry lists.

**Non-Goals:**

- Add frontend Time Entries page implementation.
- Add repository-based search.
- Add task reassignment or create-entry flow changes.
- Add full-text search, ranking, fuzzy matching, or cross-field search.
- Add database migrations or search-specific indexes in the first implementation pass.

## Decisions

### Shared Query Contract Owns `search`

Add `search` to `timeEntryListQuerySchema` rather than adding a controller-local query parameter.

Rationale: API DTOs in this repo are generated from shared Zod contracts, and OpenAPI output derives from those DTOs. Keeping `search` in the shared schema preserves the current contract-first flow and gives frontend code a typed query shape when it starts consuming this endpoint.

Alternative considered: create a separate own-time-entry query DTO. This would avoid exposing `search` on project time-entry lists, but it would add extra schema surface and diverge from the current shared `TimeEntryListQueryDto` usage.

### Shared Schema May Affect Project Time Entries Too

Because `TimeEntryListQueryDto` is also used by `GET /projects/:projectId/time-entries`, the implementation should allow `search` to filter that endpoint as well.

Rationale: this is accepted by product direction, is behaviorally consistent, and avoids adding near-duplicate DTOs only to restrict a useful filter from a related list endpoint.

Alternative considered: ignore `search` in `listProjectEntries()`. That would make OpenAPI advertise a query parameter that does nothing, which is worse than consistent support.

### Use Escaped PostgreSQL `ILIKE`

Apply search with PostgreSQL case-insensitive partial matching against `tasks.title`, escaping `%`, `_`, and the escape character so user input is treated as literal text.

Rationale: the requirement is partial task-title matching, not wildcard syntax. Escaping prevents accidental broad matches when users type LIKE wildcard characters and keeps behavior predictable.

Alternative considered: `lower(title) LIKE lower(...)`. `ILIKE` is simpler in PostgreSQL and matches the database already used by the API.

### Keep Existing Offset Pagination

Reuse the existing `page` and `limit` behavior. Add the search condition to the same `where` expression used by both the list query and the count query.

Rationale: the endpoint is already offset-paginated, `limit` is capped at 100, and the change only adds one filter. Cursor pagination would be a larger API behavior change without current evidence that it is needed.

Alternative considered: client-side filtering after fetching a page. That would miss matches outside the current page and produce incorrect pagination metadata.

### No Search Index In This Change

Do not add a trigram/full-text index or PostgreSQL extension as part of this change.

Rationale: own-entry lists are already constrained by workspace, user, and optional date filters. Adding an index requires migration and operational decisions that are not necessary to satisfy the functional requirement.

Alternative considered: add `pg_trgm` and a GIN index on `tasks.title`. Keep this as a future performance enhancement if real query plans or production data show a bottleneck.

## Risks / Trade-offs

- Search can be slower on very large task/title datasets without a trigram index -> mitigate by keeping `limit` capped, composing with existing workspace/user/date filters, and deferring index work until there is performance evidence.
- The shared query schema exposes `search` on project time-entry lists as well as own entries -> mitigate by intentionally supporting it consistently in both code paths and documenting the behavior.
- Existing docs currently say the Time Entries lookup is `taskId`-only -> mitigate by updating API/UI documentation during implementation to reflect the accepted product decision.
- Free-text search semantics may be ambiguous for whitespace-only input -> mitigate by normalizing trimmed empty search to no filter.

## Migration Plan

- Update shared contract and API service code in one deploy.
- Regenerate OpenAPI after contract/DTO changes using the build-based export workflow documented in `apps/api/AGENTS.md`.
- No database migration is required.
- Rollback is code-only: remove the `search` schema field and service condition, then regenerate OpenAPI.

## Open Questions

- None for the initial implementation. Performance indexing should be revisited only if measured query plans or production data justify it.
