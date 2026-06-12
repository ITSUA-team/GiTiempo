## Context

Issue #222 asks for Description, Priority, Status, and Assignee support in both Projects task create and edit modals. This change implements that assignment support as multiple assignees per task. Today the shared task contract accepts only `title` on create and `title`, `status`, and `isActive` on update. The API task table stores title, status, active state, and timestamps, and the user-web Projects dialog state mirrors that limited shape.

This change spans `packages/shared`, `apps/api`, database migrations, generated OpenAPI, and `apps/user-web`. It should preserve existing task visibility rules, existing close-task timer behavior, and current Projects page data flow where visible projects provide the project member options used by task dialogs.

## Goals / Non-Goals

**Goals:**

- Add provider-neutral task metadata fields: nullable description, priority, status on create/edit, and multiple assignees.
- Keep task create/update/list/detail contracts consistent across shared Zod schemas, Nest DTOs, API responses, and generated OpenAPI.
- Persist metadata on local tasks without mixing provider-specific GitHub identifiers into core task columns.
- Update the user-web Projects task dialog to render, validate, prefill, clear, and save all requested metadata fields.
- Cover backend, shared-contract, and user-web create/edit behavior with focused tests.

**Non-Goals:**

- No new GitHub sync behavior or upstream GitHub issue mutation.
- No new workspace member management UI.
- No assignment notifications, audit trails, or task history.
- No new task filtering/sorting by priority or assignee beyond preserving existing search behavior.
- No changes to time-entry description semantics; task description is separate metadata.

## Decisions

### Task Metadata Shape

Use these shared task fields:

- `description: string | null`, max 2000 characters.
- `priority: "low" | "medium" | "high"`, default `medium`.
- `status: "open" | "closed"`, existing enum, now accepted on create as well as update.
- `assignees: ProjectMember[]` on responses, reusing the existing project member summary shape (`userId`, `displayName`, `email`, `avatarUrl`, `role`).
- `assigneeIds?: string[]` on create/update requests. Omitted means no assignment change on update; an empty array clears all assignees.

Rationale: nullable description matches existing project/time-entry description conventions. A three-value priority enum is enough for the requested UI without introducing custom priorities. Returning assignee summaries lets rows/dialogs render names without a second lookup, while request payloads stay compact and stable.

Alternative considered: keep a single-assignee request/response shape. Rejected because users need to assign one task to multiple project members.

### Assignee Scope

Limit assignable users to active members assigned to the selected task project. An empty assignee list remains valid and means unassigned.

Rationale: Projects page task forms already operate inside project sections and project responses already include assigned project members. This avoids a new workspace-member picker endpoint and prevents assigning work to users who are not part of that project.

Alternative considered: allow any active workspace member on public projects. Rejected for this change because it would require broader option loading and would make the Projects dialog behavior depend on project visibility in a way the current UI does not expose.

### Data Model

Add provider-neutral task columns:

- `description text null`
- `priority varchar(20) not null default 'medium'`

Add a provider-neutral task-assignee join table:

- `task_assignees.workspace_id uuid not null`
- `task_assignees.project_id uuid not null`
- `task_assignees.task_id uuid not null`
- `task_assignees.user_id uuid not null`
- unique `(task_id, user_id)` pairs.

Keep provider identity in task external reference records only. Validate assignee workspace/project membership in the task service before write; the database can enforce task/user/workspace/project references, while service validation enforces the project-assignment rule that spans task project and membership state.

Rationale: description and priority are one-to-one task metadata and belong on `tasks`; assignments are one-to-many and belong in a join table. Provider linkage remains separate.

Alternative considered: keep assignment as a nullable column on `tasks`. Rejected because one task can have zero, one, or many assignees.

### API Mapping And Validation

Task service create/update should parse the shared schemas, validate project visibility as today, validate assignee membership when `assigneeIds` is supplied, write metadata, and return authoritative task responses. Task list/detail should hydrate assignee summary arrays with the same shape used by project members.

Closing a task through create status `closed` does not require timer cleanup because no time entries can exist yet. Closing through update must preserve the existing transaction that stops running entries.

### Frontend Flow

Extend `useProjectTaskDialog` to own description, priority, status, and assignee IDs for both modes. The dialog component should receive selected project members as assignee options derived from the selected project in `visibleProjects`.

Create mode defaults:

- `description = null` after trimming empty text.
- `priority = "medium"`.
- `status = "open"`.
- `assigneeIds = []`.

Edit mode should prefill from `TaskResponse`. If the project changes in create mode and selected assignees are not in the new project's members, remove invalid assignees. Project remains display-only in edit mode.

Use PrimeVue form controls consistent with the current dialog: `Textarea` for Description, `Select` for Priority and Status, and `AutoComplete multiple` for Assignees. Keep request errors retryable and keep existing save/close behavior.

## Risks / Trade-offs

- Assignee validation can drift from frontend options -> Mitigate with API validation tests for valid assignees, invalid project members, and clearing assignees.
- Adding required response fields can break stale frontend fixtures -> Mitigate by updating shared contract tests and all affected user-web fixtures in the same change.
- Task close transaction could accidentally bypass metadata updates -> Mitigate with API tests that update status and another metadata field together.
- Larger task dialog can feel cramped on mobile -> Mitigate with the existing PrimeVue Dialog responsive width and vertical field stack; verify mobile rendering through component tests and manual visual review if implementation proceeds.
- Active parallel UI changes may touch Projects task actions -> Keep this change scoped to dialog fields and form payloads, not action placement.

## Migration Plan

1. Add the task metadata columns and join table with safe defaults/backfills: nullable description, non-null priority defaulted to `medium`, and no task-assignee rows for previously unassigned existing tasks.
2. Update shared contracts and backend DTOs before updating frontend consumers so TypeScript exposes all new response fields.
3. Update task service mapping and tests, then regenerate OpenAPI.
4. Update user-web dialog state, component props/emits, mutation payloads, and tests.

Rollback is low risk: keeping the new nullable/defaulted columns in place is safe if application code is reverted, because older code ignores unknown database columns.

## Open Questions

- None. This proposal chooses `low | medium | high` priority values, `medium` default, nullable description, and project-member-scoped multiple assignees.
