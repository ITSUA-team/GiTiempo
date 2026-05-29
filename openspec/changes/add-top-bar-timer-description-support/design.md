## Context

The top-bar timer is owned by `apps/user-web` shell chrome and uses shared time-entry contracts from `packages/shared`. Current source behavior is task-only: `startTimerSchema` requires only `taskId`, the frontend `TimeEntriesClient.startTimer` accepts only a task id, and the backend rejects all updates to running own entries. The approved docs and `GITiempo.pen` now require a `Description` field directly below Task in the `TopBarTimerTaskDialog`; that value is a time-entry note, not task metadata.

This change spans shared contracts, NestJS time-entry API behavior, OpenAPI output, and user-web top-bar timer state. Affected implementation must follow root monorepo instructions, `apps/api/AGENTS.md` for backend work, `apps/user-web/AGENTS.md` for user-web work, and `docs/ui/INDEX.md` plus the relevant UI section docs for the dialog and shell timer.

## Goals / Non-Goals

**Goals:**

- Let idle top-bar timer starts include an optional nullable time-entry description.
- Let users update the active running timer's task and description from the top-bar task picker without stopping the timer.
- Keep running timers protected from interval and billing edits until stopped.
- Keep shared Zod contracts, API DTOs, frontend request boundaries, OpenAPI output, docs, specs, and `.pen` parity aligned.
- Preserve existing visible-project, active-task, single-running-timer, request-error, toast, and cache-reconciliation behavior.

**Non-Goals:**

- No new database column or migration; time entries already have nullable description storage.
- No manual interval, billable, project creation, or full time-entry edit form in the top-bar dialog.
- No change to Chrome extension `start-from-github` request shape or GitHub issue start behavior.
- No description display in the compact top-bar surface beyond the picker/edit flow.
- No cross-app UI change for `admin-web`.

## Decisions

1. Extend the existing timer start contract instead of adding a new endpoint.

   `startTimerSchema` should become `{ taskId: uuid, description?: string | null }` and remain strict. This keeps the timer start boundary cohesive and lets backend, frontend, DTOs, and OpenAPI share one payload. A separate "start with description" endpoint was rejected because it would duplicate single-running-timer checks and split client behavior for the same action.

2. Reuse the existing own-entry update endpoint for running task/description changes.

   `PATCH /time-entries/:id` already validates `taskId` and `description` through `updateTimeEntrySchema`. Backend service rules should branch by entry state: completed entries retain the existing editable fields, while running entries accept only `taskId` and/or `description`. Requests that include `startedAt`, `endedAt`, or `isBillable` for a running entry must still fail with a conflict that tells the caller to stop the timer first. A dedicated running-timer update endpoint was rejected because it would duplicate ownership checks and create another frontend mutation path for the same time-entry resource.

3. Keep task visibility and active-work validation identical for start and update.

   Timer start and running-entry task updates must continue to require a visible active task in an active project. Moving a running timer to an invisible private task should remain a 404, and moving it to inactive work should remain a 422. This preserves existing project/task authorization semantics and avoids a timer-specific permission branch.

4. Treat `Description` as a time-entry draft in the top-bar picker.

   The dialog should expose a PrimeVue `Textarea` directly below Task. When idle, confirmation stores selected task context plus a normalized description draft for the next Start action; the Start action submits both values. When running, opening the dialog pre-fills the textarea from `currentTimer.description`, and confirmation sends `{ taskId, description }` to the running entry update endpoint. Whitespace-only descriptions should submit as `null`; omitted description should preserve server state only where no description edit is being submitted.

5. Reconcile current timer and list caches from authoritative API responses.

   On successful start, stop, or running update, user-web should set `summary.currentTimer` from the response and update selected context from that same entry. The mutation should reconcile or invalidate current timer, recent/list entries, dashboard summaries, and timer-related query keys consistently with existing timer mutations. On API conflict, the UI should show toast feedback, refresh authoritative timer state, and keep the dialog inputs retryable.

6. Keep design parity centered on existing approved sources.

   The `.pen` and docs already establish field order: Project, Task, Description, Create new task, footer actions. Implementation should use PrimeVue `Textarea`, keep mobile near-full-width dialog behavior, keep footer button order with `Use selected task` first on mobile, and avoid adding explanatory in-app text beyond the approved labels/helper copy.

## Risks / Trade-offs

- Running-entry update broadens an endpoint that previously rejected all running updates -> mitigate with explicit service-level allowed-field checks and tests that still reject `startedAt`, `endedAt`, `isBillable`, and running deletes.
- Description draft could accidentally reuse an old note on future idle starts -> mitigate by resetting idle dialog description to blank unless editing an active running timer, and by submitting the draft only with the next Start action.
- Local timer state and query caches can drift after task/description updates -> mitigate by using the API response as authoritative and adding composable/query tests for start, running update, conflict refresh, and cache invalidation/reconciliation.
- OpenAPI/DTO drift can make clients see stale shapes -> mitigate by updating generated DTO/OpenAPI artifacts through the repo's documented OpenAPI export flow after contract changes.
