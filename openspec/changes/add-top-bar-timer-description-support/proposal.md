## Why

The approved top-bar timer picker now includes a time-entry `Description` field, but the current timer API and UI behavior only carry the selected task. Without contract, API, and frontend support, users cannot persist a note when starting a timer or changing the task on a running timer from the global timer surface.

## What Changes

- Extend timer start behavior so `POST /time-entries/timer/start` accepts an optional nullable `description` and stores it on the new running time entry.
- Allow own running time entries to update `taskId` and `description` through the existing own-entry update endpoint while still preventing running-entry edits to `startedAt`, `endedAt`, and `isBillable`.
- Update the user-web top-bar task picker to include a Description textarea below Task, use that value for the next idle Start action, and save task/description changes against the running entry when the timer is active.
- Preserve existing task/project visibility rules, active-work validation, single-running-timer protection, manual interval ownership by the Time Entries page, and Chrome extension GitHub timer behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `contracts`: Timer start request validation accepts optional nullable description while preserving strict payload validation.
- `time-tracking-api`: Timer start persists optional description, and running own-entry updates permit task/description-only changes.
- `user-pages`: The global top-bar timer task picker supports editing a time-entry description for idle starts and running timers.

## Impact

- Shared contracts and OpenAPI: `packages/shared/src/contracts/time-entries.ts`, generated DTO/OpenAPI output.
- Backend API: time-entry DTOs/controllers/services, running-entry update rules, timer start persistence, and API tests.
- User web: top-bar timer dialog, timer composables, time-entry client/query boundaries, cache reconciliation, toasts, and component/composable tests.
- Source-of-truth parity: existing docs and `GITiempo.pen` already describe/show the Description field and should be kept aligned during implementation.
