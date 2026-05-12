## Why

The user Time Entries page needs task-title search to filter the full server-side result set while preserving pagination metadata. The current own time-entries API supports pagination and exact date/project/task filters, but it cannot filter entries by partial task title.

## What Changes

- Add an optional `search` query parameter to the shared time-entry list query contract.
- Filter time-entry lists by case-insensitive partial task title matches when `search` is provided.
- Compose `search` with existing `page`, `limit`, `dateFrom`, `dateTo`, `projectId`, and `taskId` filters.
- Preserve existing ownership, workspace scoping, visibility rules, response shape, descending time ordering, and pagination metadata.
- Accept that the shared query contract may expose the same task-title search behavior on project time-entry lists as well as own time-entry lists.
- Reconcile existing UI/API documentation that previously described the Time Entries task lookup as `taskId`-only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `time-tracking-api`: time-entry list endpoints gain task-title search filtering while preserving existing scoping and pagination behavior.
- `contracts`: the shared time-entry list query validation gains an optional `search` field.

## Impact

- `packages/shared/src/contracts/time-entries.ts` query schema and generated types.
- `apps/api/src/time-entries/dto/time-entry-list-query.dto.ts` through the shared Zod DTO wrapper.
- `apps/api/src/time-entries/services/time-entries.service.ts` list filtering logic.
- `packages/shared/openapi.json` after OpenAPI regeneration.
- Time-entry API e2e tests covering task-title search, composition, and filtered pagination metadata.
- API/UI docs that describe time-entry list query behavior.
