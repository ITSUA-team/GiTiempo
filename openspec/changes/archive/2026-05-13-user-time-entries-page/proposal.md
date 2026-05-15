## Why

The authenticated user Time Entries route is still a placeholder even though timer start/stop has moved into the global top bar and manual completed-entry management is now owned by this page. Implementing the page closes the MVP workflow for reviewing, filtering, creating, editing, and deleting a user's own tracked time from the approved UI design.

## What Changes

- Replace the `user-web` `/time-entries` placeholder with the approved page layout: header CTA, date/project/task filters, grouped day sections, row actions, running-entry highlight, pagination, and distinct loading/empty/request-error states.
- Add a reusable page-owned time-entry dialog for create and edit flows using PrimeVue controls and the approved field order.
- Add deletion through the standard PrimeVue confirmation pattern with toast feedback and list refresh behavior.
- Extend own completed time-entry update support so edit mode can move an entry to another visible active task when the selected project/task changes.
- Keep running entries visible and highlighted, but do not allow editing them as completed manual intervals before they are stopped from the top-bar timer.
- Align frontend tests and fetch-boundary coverage with the new page behavior and any updated request contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: define the complete Time Entries page record-management behavior beyond the current minimal manual-entry ownership and edit-dialog requirements.
- `time-tracking-api`: allow own completed time-entry updates to change the task to another visible active task while preserving running-entry protection.
- `contracts`: add `taskId` to the shared time-entry update request validation and generated API contract.

## Impact

- `apps/user-web/src/views/TimeEntriesView.vue` and related user-web components/composables/tests for the Time Entries page.
- `apps/user-web/src/services/time-entries-client.ts` and tests for list/create/update/delete request behavior.
- `packages/shared/src/contracts/time-entries.ts` and generated `packages/shared/openapi.json` for the update payload shape.
- `apps/api/src/time-entries` DTO/service/controller tests for task-changing own-entry updates.
- Approved UI source `GITiempo.pen` Time Entries and Time Entry Dialog frames remain the desktop parity target.
