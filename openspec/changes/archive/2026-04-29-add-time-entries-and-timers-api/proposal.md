## Why

The backend now has workspace membership, project visibility, and provider-neutral tasks, but it still cannot record the core product activity: tracked time. This change adds the API and persistence layer for timers, manual time entries, own-entry CRUD, project time review, and Chrome Extension timer starts so user-facing and extension work can build on stable contracts.

## What Changes

- Add `time_entries` persistence for task-linked tracked intervals owned by the current user and workspace.
- Enforce one running timer per user at the database level with a partial unique index.
- Add timer endpoints for current timer lookup, starting a timer against an existing task, starting a timer from a GitHub issue request, and stopping the current timer.
- Add manual time-entry creation and own-entry read, list, update, and delete endpoints.
- Add read-only project time-entry listing for visible projects so admins, PMs, and assigned members can review project time without gaining edit rights over other users' entries.
- Add shared Zod contracts and DTO wrappers for time-entry request, response, list, timer, and Chrome Extension request shapes.
- Define list filtering semantics for `dateFrom`, `dateTo`, `projectId`, `taskId`, `page`, and `limit`.
- Defer invoices and `time_entries.invoice_id` until the invoices/reporting change.

## Capabilities

### New Capabilities

- `time-tracking-api`: Own time-entry CRUD, manual entries, timers, Chrome Extension timer start, and read-only project time-entry review behavior.

### Modified Capabilities

- `data-model`: Add durable time-entry storage behavior, duration invariants, running-timer uniqueness, and the explicit deferral of invoice linkage.
- `contracts`: Add shared time-entry, timer, list-query, and Chrome Extension request/response contracts.
- `api-conventions`: Clarify time-entry date filtering as `startedAt` range filtering with inclusive `dateFrom` and exclusive `dateTo`.
- `project-management`: Extend project visibility behavior to project-scoped time-entry reads.
- `task-management`: Clarify that only visible active tasks in active projects can receive new time entries or timers.

## Impact

- Affected backend app: `apps/api` NestJS modules, controllers, services, Drizzle schemas, migrations, seed/test data, and e2e coverage.
- Affected shared package: `packages/shared/src/contracts/*`, package exports, and generated OpenAPI output.
- Affected docs/specs: OpenSpec data model, contract, API convention, project-management, task-management, and new time-tracking API behavior.
- New database object: `time_entries` table and indexes. No invoices table or invoice linkage is introduced in this change.
