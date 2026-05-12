## Context

The `user-web` Time Entries route currently renders a shared placeholder while the approved UI docs and `GITiempo.pen` define a full record-management page. The top-bar timer change removed the dedicated timer page, so completed manual interval creation and own-entry review/edit/delete now need to be completed on `/time-entries`.

The change spans `apps/user-web`, `packages/shared`, and `apps/api`: the page can already list, create, and delete entries through existing endpoints, but the documented edit flow requires changing project/task and the current shared update contract does not include `taskId`. The implementation must follow `apps/user-web/AGENTS.md`, `apps/api/AGENTS.md`, and the UI requirements in `docs/ui/pages-user.md`, `docs/ui/patterns.md`, `docs/ui/layout.md`, and `docs/ui/accessibility.md`.

## Goals / Non-Goals

**Goals:**

- Implement the approved Time Entries page in `apps/user-web` with grouped entries, filters, pagination, distinct data states, and row actions.
- Provide a page-owned PrimeVue dialog for manual create and completed-entry edit flows using the approved field order and copy.
- Preserve the top-bar timer as the only start/stop surface while showing running entries in the page as highlighted, non-editable rows.
- Update the shared/backend update contract so edit mode can move completed entries to a different visible active task.
- Add focused frontend, contract, and backend tests for the new behavior.

**Non-Goals:**

- No new project creation from the Time Entries page dialog.
- No pause/resume timer behavior.
- No admin/team time-entry management page.
- No invoice/report integration changes.
- No new backend summary endpoint for this page.

## Decisions

1. Build a focused user-web Time Entries feature instead of extending the top-bar timer feature.

   The top-bar timer owns running timer start/stop and task-context selection; the Time Entries page owns completed manual records and historical review. Keeping these boundaries separate avoids reintroducing manual interval controls into shell chrome. The alternative was to reuse top-bar timer state directly in the page, but that would couple page filters and dialogs to shell lifecycle concerns.

2. Use a page composable plus small presentational sections rather than a single route mega-component.

   `TimeEntriesView.vue` should compose page infrastructure, global service hosts (`Toast`/`ConfirmDialog` where needed), and feature sections. Data loading, filter state, pagination, grouping, mutation feedback, and dialog state should live in a focused composable or feature module so the route stays testable. The alternative was to implement all state and markup in the route view, but that would make list refresh, dialog transitions, and error states harder to cover.

3. Treat `GET /time-entries` as the source of truth for the list and use backend filtering for task-title search.

   Date range, single project, selected task, free-text task search, page, and limit should map to the shared list query. Task lookup suggestions can be built from visible projects/tasks that the user can access, but submitted list filtering should use `search` for text and `taskId` only when a concrete task option is selected. The alternative was frontend-only filtering, but that would conflict with paginated server metadata.

4. Extend the update contract with `taskId` and validate task visibility on the backend.

   The approved edit dialog includes project and task fields, and API docs already describe `taskId` as patchable. The shared `updateTimeEntrySchema` should accept optional `taskId`, and `TimeEntriesService.updateOwnEntry()` should use `TasksService.requireTrackableTask()` before moving the completed entry. This preserves authorization and active-project/task checks. The alternative was narrowing the UI to immutable project/task fields, but that would conflict with approved docs/design.

5. Keep running rows visible but mutation-safe.

   Running entries should remain visible and highlighted with the documented running duration format, but edit/delete controls should be disabled or omitted for running entries because the backend rejects mutation until stop. The page should point users to the top-bar timer for stop behavior rather than adding a second stop button. The alternative was to surface failed edit/delete attempts after clicking, but disabling or omitting unavailable actions is clearer and easier to test.

6. Refresh list state after successful mutations and use toast feedback for visible API outcomes.

   Create, edit, and delete should show success/error feedback and refresh the current list page from the backend. Failed reads should render request-error UI distinct from empty data and also use the standard toast flow. The alternative was optimistic mutation-only updates, but backend-derived grouping/pagination and conflict/error cases make refresh safer for MVP.

## Risks / Trade-offs

- Backend contract update touches shared package, API, OpenAPI, and frontend client → update tests at each boundary and regenerate the OpenAPI snapshot.
- Task lookup requires loading visible projects/tasks and can become chatty → load tasks lazily by selected project and keep task-title search usable through backend `search` even before a concrete task is selected.
- Date/time conversion can drift by timezone → keep API payloads as ISO datetimes and add tests around date range query construction and dialog payload mapping.
- Running rows are visible but not editable → make the disabled/omitted action state explicit in tests and copy so users know to use the top-bar timer to stop first.
- Page-specific design frames cover desktop happy path more than every state → use documented shared loading, empty, request-error, confirmation, toast, and accessibility patterns for missing state-specific Pen coverage.
