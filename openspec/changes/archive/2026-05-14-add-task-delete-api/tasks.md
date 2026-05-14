## 1. API Endpoint

- [x] 1.1 Add `DELETE /tasks/:id` to `TasksController` with 204 no-content response metadata and documented 404/409 responses.
- [x] 1.2 Add `TasksService.deleteTask(user, taskId)` that reuses existing task visibility checks.
- [x] 1.3 Block deletion when any related `time_entries` row exists and return `409 Conflict` with an explanatory message.
- [x] 1.4 Delete unused tasks by id/workspace and allow existing task external refs to cascade.
- [x] 1.5 Convert concurrent PostgreSQL FK violations from `time_entries.task_id` into `409 Conflict` instead of leaking a 500.

## 2. Contracts And OpenAPI

- [x] 2.1 Confirm no task response schema changes are needed and do not add delete-eligibility fields.
- [x] 2.2 Refresh generated OpenAPI output so `DELETE /tasks/:id` is represented.

## 3. Tests

- [x] 3.1 Add e2e coverage for successful deletion of a visible unused task and verify subsequent reads return 404.
- [x] 3.2 Add e2e coverage that an invisible task delete returns 404 and leaves the task unchanged.
- [x] 3.3 Add e2e coverage that a task with completed time entries returns 409 and remains readable.
- [x] 3.4 Add e2e coverage that a task with a running time entry returns 409 and the running entry remains unchanged.
- [x] 3.5 Add e2e coverage that external refs are removed when an unused linked task is deleted.

## 4. Verification

- [x] 4.1 Run the affected API e2e tests for projects/tasks.
- [x] 4.2 Run API typecheck and lint for `@gitiempo/api`.
- [x] 4.3 Run OpenSpec validation/status checks for `add-task-delete-api`.
