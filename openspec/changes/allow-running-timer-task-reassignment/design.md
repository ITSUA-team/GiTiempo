## Context

The current `time-tracking-api` spec allows updates only for completed own time entries and says running entries cannot be updated. The active branch adds a narrower behavior: a running entry can move to another visible active task while it remains running, but other running-entry edits and deletion remain blocked until stop.

This spans `apps/api` and `apps/user-web`. Backend behavior owns the contract for `PATCH /time-entries/:id`; the user app consumes that contract from the global top-bar timer task picker.

## Goals / Non-Goals

**Goals:**

- Allow task-only reassignment for the authenticated user's own running entry.
- Keep non-task running-entry updates and running-entry deletes rejected.
- Keep the top-bar timer task picker aligned with the authoritative current timer after reassignment.
- Preserve existing update request/response shapes and OpenAPI endpoint paths.

**Non-Goals:**

- Adding a new timer-specific reassignment endpoint.
- Allowing manual interval fields, description, billable state, start, or end time edits while an entry is running.
- Adding page-local timer controls to Dashboard or Time Entries.
- Changing cross-tab or realtime synchronization behavior.

## Decisions

- Reuse the existing own-entry update endpoint for running task reassignment. This keeps completed-entry and running-entry task visibility validation in one backend path and avoids introducing another top-bar-only API.
- Treat running-entry updates as valid only when the submitted payload is exactly task reassignment. Mixed payloads that include `taskId` plus completed-entry fields remain rejected before applying any task change.
- Validate the replacement task with the same trackable-task rules used by timer start and completed-entry task reassignment: invisible private tasks resolve as not found, inactive work is rejected, and the original running entry remains unchanged on failure.
- In user-web, the top-bar picker opens from current timer state when a timer is running. Successful reassignment refreshes the authoritative current timer summary before updating visible context, so stale mutation responses cannot overwrite newer active timer state.

## Risks / Trade-offs

- Broader PATCH semantics can be misread as allowing all running-entry edits -> Mitigate with explicit spec scenarios and backend tests for mixed and non-task running updates.
- Reusing the existing endpoint means the client must distinguish task-only running updates from completed-entry editing -> Mitigate by keeping the behavior owned by the top-bar timer picker and preserving Time Entries edit/delete restrictions for running rows.
- A concurrent stop or reassignment can make the mutation response stale -> Mitigate by refreshing current timer state after successful reassignment and leaving failed reassignment visible in the dialog with inline error feedback.
