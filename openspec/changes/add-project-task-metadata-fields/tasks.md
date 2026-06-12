## 1. Discovery And Source Of Truth

- [x] 1.1 Read `apps/api/AGENTS.md`, `apps/user-web/AGENTS.md`, and the proposal/design/specs for this change.
- [x] 1.2 For the frontend work, read `docs/ui/INDEX.md`, the smallest relevant `docs/ui/*` files it routes to, and the approved `GITiempo.pen` Projects screen before editing.
- [x] 1.3 Inspect current task contracts, task schema/migrations, `TasksService`, Projects task dialog state, and Projects task component tests to identify all fixtures that need new task metadata fields.

## 2. Shared Contracts And Data Model

- [x] 2.1 Add shared task priority and assignees response schemas, then extend `TaskResponse`, task list/detail responses, `createTaskSchema`, and `updateTaskSchema` with description, priority, status-on-create, and assignee metadata.
- [x] 2.2 Update shared task contract tests for metadata defaults, accepted create/update fields, nullable description and assignee, invalid priority, overlong description, and unknown-field rejection.
- [x] 2.3 Add a Drizzle migration for task metadata columns and assignments: nullable description, non-null priority defaulted to `medium`, and a task-assignees join table.
- [x] 2.4 Extend `apps/api/src/tasks/schemas/tasks.schema.ts` and related inferred types for the new metadata columns.

## 3. API Behavior

- [x] 3.1 Update task create to persist supplied metadata, apply defaults when omitted, and validate assignee project membership when `assigneeIds` is supplied.
- [x] 3.2 Update task list/detail/update queries to hydrate assignee summary arrays and return the expanded shared task response shape.
- [x] 3.3 Update task update to apply description, priority, status, assignee, title, and isActive changes while preserving close-task timer cleanup behavior.
- [x] 3.4 Add API unit tests for create with metadata, default metadata, update with metadata, clearing nullable metadata, invalid assignee rejection, and status-close plus metadata update behavior.
- [x] 3.5 Regenerate `packages/shared/openapi.json` after contract/API DTO changes.

## 4. User-Web Projects Dialog

- [x] 4.1 Extend Projects task dialog state and validation to own description, priority, status, and assignee for create and edit modes.
- [x] 4.2 Update `ProjectTaskDialog.vue` to render Description, Priority, Status, and Assignees fields in both modes using PrimeVue controls and preserving current retryable error behavior.
- [x] 4.3 Derive Assignee options from the selected project's active assigned members, remove invalid selected assignees when the selected project changes, and keep Project display-only in edit mode.
- [x] 4.4 Update Projects task mutation payloads and client tests so create/update requests send the new metadata fields and use authoritative task responses.
- [x] 4.5 Update Projects page, task section, dialog, and helper tests/fixtures to cover create rendering/saving, edit prefill/saving, unassigned clearing, and validation errors for the new fields.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @gitiempo/shared build`.
- [x] 5.2 Run focused shared contract tests for task metadata.
- [x] 5.3 Run focused API task service tests.
- [x] 5.4 Run focused user-web Projects task dialog/page tests.
- [x] 5.5 Run `pnpm --filter @gitiempo/shared typecheck`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter user-web typecheck`.
- [x] 5.6 Run `pnpm --filter @gitiempo/shared lint`, `pnpm --filter @gitiempo/api lint`, and `pnpm --filter user-web lint`.
- [x] 5.7 Run `pnpm openapi:export` or the repo's current build-based OpenAPI export workflow if direct export is blocked by decorator metadata tooling.
