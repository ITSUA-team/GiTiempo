## Why

Users can start a timer from the top bar, then realize the running time entry is attached to the wrong visible task. Forcing them to stop the timer before correcting the task creates unnecessary completed-entry cleanup and conflicts with the active top-bar task picker behavior already being implemented.

## What Changes

- Allow authenticated users to update only `taskId` on their own running time entry through the existing own-entry update endpoint.
- Keep all non-task running-entry updates rejected until the timer is stopped.
- Require the replacement task to be visible and active under the same rules used by timer start and completed-entry reassignment.
- Update the user-web top-bar timer picker so opening it during a running timer preselects the running task, confirming a different task reassigns the running entry, and failed reassignment keeps the picker open with inline error feedback.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `time-tracking-api`: Allow task-only reassignment for running entries while preserving rejection of general running-entry updates.
- `user-pages`: Define top-bar active-timer task picker behavior for running timer reassignment.

## Impact

- Affected backend API: existing `PATCH /time-entries/:id` behavior for own running entries.
- Affected frontend app: `apps/user-web` top-bar timer task picker and active timer summary state.
- Affected specs: `openspec/specs/time-tracking-api/spec.md` and `openspec/specs/user-pages/spec.md` through change-local deltas.
- Affected shared contracts: existing update time-entry request shape is reused; no new endpoint or response schema is required.
