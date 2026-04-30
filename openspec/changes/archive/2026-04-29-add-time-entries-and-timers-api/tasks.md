## 1. Shared Contracts

- [x] 1.1 Add `packages/shared/src/contracts/time-entries.ts` with source enum, response schemas, current-timer response, paginated list response, list query schema, manual create schema, update schema, timer start schema, and Chrome GitHub start schema.
- [x] 1.2 Validate request schemas reject unknown fields and enforce positive pagination limits, valid UUID filters, ISO datetime filters, and valid manual/update time intervals.
- [x] 1.3 Export time-entry contracts from `packages/shared/src/index.ts`.

## 2. Database Schema And Migration

- [x] 2.1 Add `apps/api/src/time-entries/schemas/time-entries.schema.ts` with task, user, workspace, timing, duration, description, billable, source, and timestamps.
- [x] 2.2 Re-export the time-entry schema from `apps/api/src/db/schema.ts`.
- [x] 2.3 Add a Drizzle migration for `time_entries` without `invoice_id` in this change.
- [x] 2.4 Add indexes for task, user, workspace, started-at filtering, and `(workspace_id, user_id, started_at, ended_at)` list queries.
- [x] 2.5 Add partial unique index `time_entries_running_unique` on `user_id` where `ended_at IS NULL`.
- [x] 2.6 Add database check constraints for running/completed duration state and `ended_at > started_at` when completed.

## 3. API Module And DTOs

- [x] 3.1 Add `TimeEntriesModule` and import it from `AppModule`.
- [x] 3.2 Add DTO classes wrapping the shared Zod schemas with `createZodDto`.
- [x] 3.3 Add `TimeEntriesController` routes for `GET /time-entries`, `POST /time-entries`, `GET /time-entries/current`, `POST /time-entries/timer/start`, `POST /time-entries/timer/start-from-github`, `POST /time-entries/timer/stop`, `GET /time-entries/:id`, `PATCH /time-entries/:id`, `DELETE /time-entries/:id`, and `GET /projects/:id/time-entries`.
- [x] 3.4 Add Swagger decorators and Zod serializers for all new request/response shapes.

## 4. Service Behavior

- [x] 4.1 Add reusable duration calculation and row-to-response mapping that returns ISO datetimes, stored duration seconds, source, billable state, and task/project display context.
- [x] 4.2 Implement task tracking target validation so manual entries and timers require a visible active task in an active project.
- [x] 4.3 Implement own-entry list with pagination and filters for `dateFrom`, `dateTo`, `projectId`, and `taskId` using `started_at >= dateFrom` and `started_at < dateTo`.
- [x] 4.4 Implement project-entry list using existing project visibility rules and read-only access to entries for all users in that project.
- [x] 4.5 Implement manual entry creation with source `manual`, computed duration, and owner/workspace scoping.
- [x] 4.6 Implement get/update/delete for own completed entries and return 404 for entries owned by other users.
- [x] 4.7 Reject update and delete attempts for running entries with a consistent client error that says the timer must be stopped first.
- [x] 4.8 Implement current timer lookup with an explicit empty response when no timer is running.
- [x] 4.9 Implement timer start against an existing task with source `web` and map running-timer unique violations to 409 Conflict.
- [x] 4.10 Implement timer stop transactionally, handling no-running-timer as 404 and recomputing duration.
- [x] 4.11 Implement Chrome start-from-GitHub transactionally: find/create provider-neutral project, project ref, task, task ref, ensure non-admin visibility, then create source `extension` running entry.

## 5. Unit Tests

- [x] 5.1 Unit-test duration calculation for valid, invalid, running, and updated intervals.
- [x] 5.2 Unit-test manual entry creation target validation and duration persistence.
- [x] 5.3 Unit-test running-entry update/delete rejection.
- [x] 5.4 Unit-test timer start conflict mapping for the partial unique index.
- [x] 5.5 Unit-test timer stop behavior for running and missing timers.

## 6. E2E Tests

- [x] 6.1 Add e2e coverage for creating manual entries and listing own entries with pagination and filters.
- [x] 6.2 Add e2e coverage for own-entry get/update/delete and 404 behavior for another user's entry.
- [x] 6.3 Add e2e coverage for current timer, timer start, second-start conflict, and timer stop.
- [x] 6.4 Add e2e coverage that running entries cannot be updated or deleted before stop.
- [x] 6.5 Add e2e coverage for `GET /projects/:id/time-entries` for admin, assigned user, and unassigned user.

## 7. OpenAPI And Verification

- [x] 7.1 Run `pnpm --filter @gitiempo/shared build` if direct API filtered commands need the built shared package.
- [x] 7.2 Run `pnpm --filter @gitiempo/api lint`.
- [x] 7.3 Run `pnpm --filter @gitiempo/api typecheck`.
- [x] 7.4 Run `pnpm --filter @gitiempo/api test`.
- [x] 7.5 Run applicable API e2e tests after migrations and seed are applied to the test database.
- [x] 7.6 Run the build-based OpenAPI export and update `packages/shared/openapi.json`.
- [x] 7.7 Review generated migration SQL and do not apply it to a database without explicit approval.
