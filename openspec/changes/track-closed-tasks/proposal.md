## Why

Closed tasks represent work that should no longer accept new time tracking, but stale clients and concurrent requests can still attempt to create manual entries or start timers against them. We need the backend contract to make closed-task tracking impossible and reconcile any already-running timers when a task is closed.

## What Changes

- Reject manual time entries, web timer starts, and GitHub extension timer starts that target closed tasks.
- When a task transitions to `closed`, automatically stop any currently running time entries for that task.
- Ensure task close and time-entry creation paths are serialized so a timer cannot be started during the close transition.
- Keep historical time entries attached to closed tasks readable and filterable.
- Document the task-close timer side effect for API consumers.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `task-management`: closed tasks become explicitly untrackable, and closing a task closes active running entries for that task.
- `time-tracking-api`: manual entry creation and timer starts reject closed tasks across web and GitHub extension sources.

## Impact

- Backend task update flow in `apps/api/src/tasks`.
- Backend manual time-entry, timer start, timer stop, and GitHub timer flows in `apps/api/src/time-entries`.
- API unit and e2e coverage for closed-task rejection and timer reconciliation.
- API documentation in `docs/API-ENDPOINTS.md`.
