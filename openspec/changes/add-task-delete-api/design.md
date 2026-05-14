## Context

The backend task API currently supports listing, creating, reading, and updating provider-neutral tasks. The published API documentation already includes `DELETE /tasks/:id`, with deletion allowed only for tasks that have no related time entries.

The existing data model gives us the desired safety boundary:

- `time_entries.task_id` references `tasks.id` with `ON DELETE RESTRICT`, preserving tracked history.
- `task_external_refs.task_id` references `tasks.id` with `ON DELETE CASCADE`, so provider mapping rows can be removed with an unused task.
- `TasksService.requireVisibleTask()` already enforces workspace and project visibility for task read/update flows.

Affected backend files are under `apps/api`, so implementation must follow `apps/api/AGENTS.md`. Shared API contracts live in `packages/shared`, and generated OpenAPI should be refreshed after endpoint changes.

## Goals / Non-Goals

**Goals:**

- Add `DELETE /tasks/:id` to the NestJS API.
- Use existing task/project visibility semantics: authenticated users may delete only tasks they can see.
- Hard-delete only tasks with no completed or running time entries.
- Return `409 Conflict` when any time entry references the task.
- Preserve provider-neutral task response schemas and avoid delete-eligibility metadata.
- Cover the endpoint with API e2e tests and generated OpenAPI output.

**Non-Goals:**

- Do not implement task sync from external providers.
- Do not add soft-delete semantics beyond the existing `isActive` field.
- Do not change task update permissions or project visibility rules.
- Do not change frontend UI behavior in this change.
- Do not add or alter database tables or foreign keys.

## Decisions

### Reuse Existing Visibility Checks

`DELETE /tasks/:id` should call the same task visibility path used by `GET /tasks/:id` and `PATCH /tasks/:id`. This keeps delete behavior aligned with the documented `Role: Any` contract and avoids introducing a separate RBAC model for tasks.

Alternative considered: restrict delete to admins or PMs. This would be safer operationally, but it would conflict with the current documentation and with existing member-level task update behavior.

### Hard Delete Only Unused Tasks

The service should check for related `time_entries` before deleting. If at least one row exists, the API should throw `ConflictException` with an explanatory message.

Alternative considered: silently set `isActive=false` when time entries exist. This would hide the conflict but would not implement the documented permanent delete endpoint. Clients can already use `PATCH /tasks/:id` with `isActive=false` when they want archival behavior.

### Treat Running And Completed Entries Equally

Any `time_entries` row blocks deletion, regardless of whether it is completed or running. Running timers are still tracked work and are protected by the same FK relationship.

Alternative considered: stop or delete running entries automatically. That would mutate time tracking state outside the user's timer flow and risks data loss.

### Keep Delete Eligibility Out Of Task Responses

Task responses should remain provider-neutral and unchanged. Clients learn delete eligibility by attempting delete and handling `409 Conflict`, as documented.

Alternative considered: add `hasTimeEntries` or `canDelete` to task responses. This creates stale client-side eligibility state and expands response contracts for a single action.

### Guard Against Race Conditions With DB Constraints

The implementation should check for existing time entries before deletion for clear `409` behavior. It should also convert a PostgreSQL FK violation from `time_entries.task_id` into `409 Conflict` in case a time entry is inserted concurrently between the check and the delete.

Alternative considered: rely only on pre-counting. That is easier but can leak a database constraint exception as `500` under concurrent writes.

## Risks / Trade-offs

- [Risk] Any visible member can permanently delete an unused task. → Mitigation: this follows the existing `Role: Any` API contract and only applies to tasks without tracked history.
- [Risk] A concurrent time-entry insert can race with delete. → Mitigation: use the FK as the final safety boundary and map that database error to `409 Conflict`.
- [Risk] Deleting a GitHub-linked unused task removes its external mapping. → Mitigation: the cascade is intentional for unused local tasks; future sync can recreate mappings if needed.
- [Risk] Existing tests in `projects-tasks.e2e-spec.ts` share seeded state. → Mitigation: create unique projects/tasks for delete tests and clean up only those rows where needed.

## Migration Plan

No database migration is required. Deploying the API adds a new endpoint only.

Rollback is straightforward: remove the controller route/service method/OpenAPI output. Any tasks deleted while the endpoint was deployed cannot be restored without backups, but the endpoint only deletes tasks with no time-entry history.

## Open Questions

- None for this change. The proposal follows the current documentation: any authenticated user with task visibility can delete unused tasks.
