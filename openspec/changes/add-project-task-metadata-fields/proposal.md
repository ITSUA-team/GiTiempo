## Why

Projects task create and edit dialogs currently expose only a subset of task metadata, which prevents users from capturing the same operational context that issue #222 requests for Projects-page task management. Adding Description, Priority, Status, and Assignees to both flows closes the remaining Projects-page improvement extracted from #181 and aligns UI behavior with the task metadata users need to manage work.

## What Changes

- Extend provider-neutral task create, update, list, and detail behavior with editable `description`, `priority`, `status`, and multi-assignee metadata.
- Persist the new core task metadata on local tasks while keeping external-provider identifiers in task external reference records.
- Update shared task contracts and OpenAPI output so backend validation and frontend clients use the same request and response shapes.
- Update the user-web Projects create/edit task dialog to render, prefill, validate, and save Description, Priority, Status, and Assignees.
- Add API, contract, and user-web tests covering create and edit behavior for the new fields.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `task-management`: Task create, read, update, and list behavior must support editable description, priority, status, and multi-assignee metadata.
- `contracts`: Shared task request and response contracts must include the new metadata fields and validation rules.
- `data-model`: Core task records must persist the new provider-neutral task metadata and enforce valid assignment references.
- `user-projects-list-page`: Projects task create/edit dialogs must render and save the full task metadata set.

## Impact

- Affected backend code: `apps/api/src/tasks/**`, task database schema, migrations, task tests, and OpenAPI export wiring.
- Affected shared contracts: `packages/shared/src/contracts/tasks.ts`, contract tests, and `packages/shared/openapi.json`.
- Affected frontend code: user-web Projects task dialog, Projects page task state/mutation helpers, client tests, and component tests.
- Data impact: requires a database migration to add nullable description, constrained/defaulted priority, and task-assignee join-table storage for existing tasks.
