## 1. Shared Contract

- [x] 1.1 Add optional `search` to `timeEntryListQuerySchema` in `packages/shared/src/contracts/time-entries.ts` with trimming/empty handling and a bounded max length.
- [x] 1.2 Confirm `TimeEntryListQuery` and `TimeEntryListQueryDto` expose the new field through the existing shared Zod DTO wrapper.

## 2. API Filtering

- [x] 2.1 Add task-title search condition to `TimeEntriesService.buildListConditions()` so it composes with workspace, owner, date, project, and task filters.
- [x] 2.2 Use case-insensitive partial matching against `tasks.title` and escape LIKE wildcard characters in user input.
- [x] 2.3 Preserve current ownership scoping, project visibility checks, descending list ordering, response shape, and pagination metadata.
- [x] 2.4 Ensure `search` also works consistently for `GET /projects/:projectId/time-entries` because it shares `TimeEntryListQueryDto`.

## 3. Tests

- [x] 3.1 Add API e2e coverage for matching own entries by partial task title.
- [x] 3.2 Add API e2e coverage for case-insensitive own-entry search.
- [x] 3.3 Add API e2e coverage for no-match search returning an empty filtered result set with correct metadata.
- [x] 3.4 Add API e2e coverage for search composed with date and project filters.
- [x] 3.5 Add API e2e coverage that pagination metadata reflects the filtered result set.
- [x] 3.6 Add or extend coverage proving project time-entry list search respects existing visibility rules.

## 4. Documentation And Generated Artifacts

- [x] 4.1 Update API documentation to list `search?` on `GET /time-entries` and `GET /projects/:projectId/time-entries` query parameters.
- [x] 4.2 Update UI documentation that currently describes Time Entries task lookup as `taskId`-only so it no longer conflicts with backend task-title search support.
- [x] 4.3 Regenerate `packages/shared/openapi.json` using the build-based OpenAPI export workflow.

## 5. Verification

- [x] 5.1 Run API lint, typecheck, and tests for the backend changes.
- [x] 5.2 Run OpenSpec validation/status checks and confirm the change is ready for archive after implementation.
