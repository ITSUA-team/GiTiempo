## Why

The public API documentation defines `DELETE /tasks/:id`, but the backend currently supports only task list, create, read, and update operations. This leaves clients without a safe way to remove unused tasks while preserving historical tracked work.

## What Changes

- Add `DELETE /tasks/:id` for authenticated users who can see the task through existing project visibility rules.
- Permanently delete a task only when it has no related time entries.
- Return `409 Conflict` when any completed or running time entry references the task.
- Keep task responses provider-neutral and avoid adding delete-eligibility metadata such as `canDelete` or `hasTimeEntries`.
- Allow existing task external references to be removed with the task through the existing cascade relationship.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-management`: Add safe permanent deletion behavior for visible unused tasks.

## Impact

- API: adds `DELETE /tasks/:id` with `204`, `404`, and `409` outcomes.
- Backend: updates the task controller and task service; no database migration is expected.
- Shared contracts/OpenAPI: exposes the no-content endpoint in generated OpenAPI without changing task response schemas.
- Tests: adds e2e coverage for successful deletion, invisible tasks, tasks with time entries, and task external reference cleanup.
