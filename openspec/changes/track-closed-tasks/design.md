## Context

Time tracking is split across task management and time-entry APIs. Today, a task can be closed while stale clients or concurrent requests still attempt to create manual entries or running timers for that task. Running timers already reference task rows, so task close must reconcile existing timers without deleting historical time entries.

Affected areas:

- `apps/api`: task update flow, time-entry creation/update flow, GitHub extension timer start flow, and tests.
- `docs`: API endpoint documentation for task close side effects.
- `openspec`: task-management and time-tracking-api requirements.

## Goals / Non-Goals

**Goals:**

- Treat closed tasks as invalid targets for new manual entries, web timers, GitHub extension timers, and task reassignment.
- Stop currently running entries for a task when the task transitions to `closed`.
- Serialize task close with time-entry creation so a race cannot create a running entry after the task is closed.
- Preserve completed historical time entries and their ability to appear in time-entry lists and reports.
- Keep the behavior backend-authoritative so stale clients receive consistent API responses.

**Non-Goals:**

- Do not delete closed tasks or historical entries.
- Do not remove closed tasks from historical filters where existing entries still reference them.
- Do not introduce a new task status model or reopen workflow.
- Do not add a separate background job for timer reconciliation.

## Decisions

- Use transactional row locks for task trackability checks.
  - Rationale: starting a timer and closing a task both depend on the same task state. Locking the task row in the write transaction makes the backend serialize these operations.
  - Alternative considered: validate task state before insert without locking. This is simpler but leaves a race where a timer can start during close.

- Stop running entries during the task-close transaction.
  - Rationale: once `PATCH /tasks/:id` returns a closed task, `GET /time-entries/current` should no longer expose running entries for that task.
  - Alternative considered: allow existing timers to continue and only block future starts. That creates confusing UI state where closed work remains actively tracked.

- Use a bulk update for closing running entries.
  - Rationale: a task may have multiple users tracking it. A single conditional update is simpler and avoids per-entry round trips.
  - Alternative considered: load every running entry and update each one. That is easier to reason about in application code but less efficient and less atomic.

- Keep closed-task rejection as `422 Unprocessable Entity`.
  - Rationale: the requester can see the task, but the task state makes the requested tracking action invalid. This matches inactive task/project rejection semantics.
  - Alternative considered: return `404 Not Found` to hide closed tasks. That would conflict with historical visibility and task read behavior.

## Risks / Trade-offs

- Concurrent task close and timer start can deadlock if future code locks related rows in a different order. Mitigation: keep task-row locking as the first task-state write dependency in time-entry creation paths.
- Bulk SQL duration calculation duplicates the duration rule at the database-expression level. Mitigation: keep the expression limited to task-close reconciliation and cover it with unit/e2e tests.
- Clients may still show stale open-task options. Mitigation: backend rejects closed-task tracking authoritatively, and frontend can refresh state after rejection.
- Task-close side effects may surprise API consumers. Mitigation: document the behavior in `docs/API-ENDPOINTS.md` and OpenSpec.
