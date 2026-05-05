## 1. Data Model And Shared Contracts

- [x] 1.1 Add project visibility type/schema values `public` and `private` to shared contracts.
- [x] 1.2 Update `projects` Drizzle schema with a `visibility` column, private default, and visibility constraint.
- [x] 1.3 Add a Drizzle migration that backfills existing projects to `private`, enforces `NOT NULL`, and adds any required visibility index.
- [x] 1.4 Update seed data only where explicit public fixtures are needed for tests.
- [x] 1.5 Extend project create/update/request contracts to support optional visibility where allowed and keep `{ isActive }` valid as a single-field update.
- [x] 1.6 Extend project response contracts with `visibility`, `source`, and `totalHours`.
- [x] 1.7 Add shared response contracts and DTOs for management and user project summaries.

## 2. Project Visibility And Response Enrichment

- [x] 2.1 Update project response mapping to include visibility, derived MVP source, and completed-entry total hours.
- [x] 2.2 Replace project list/detail queries with grouped SQL aggregation for source and total hours without N+1 queries.
- [x] 2.3 Update visible-project filtering so non-admin users can access active public projects or active assigned projects.
- [x] 2.4 Ensure list results and summary counts deduplicate projects that are both public and assigned.
- [x] 2.5 Update project creation to persist explicit visibility or default to private.
- [x] 2.6 Update project patch behavior so admins can change all mutable fields including `isActive`, while PMs can update visible active project metadata except `isActive`.
- [x] 2.7 Preserve member rejection on project mutation endpoints unless a later spec changes role policy.

## 3. Summary Endpoints

- [x] 3.1 Add `GET /projects/management-summary` before `GET /projects/:id` in the controller route order.
- [x] 3.2 Implement admin management summary counts across all active workspace projects.
- [x] 3.3 Implement PM management summary counts across active public projects plus active assigned projects, counted distinctly.
- [x] 3.4 Add `GET /projects/my-summary` before `GET /projects/:id` in the controller route order.
- [x] 3.5 Implement visible project counting for the authenticated user's active visible project scope.
- [x] 3.6 Implement own tracked-hours week/month totals from completed entries using UTC ISO week and UTC calendar month windows.

## 4. Project-Scoped Access Integration

- [x] 4.1 Verify task list/create/read/update behavior uses the updated public/private project visibility rules.
- [x] 4.2 Verify manual time-entry creation uses the updated public/private project visibility rules.
- [x] 4.3 Verify timer start against existing tasks uses the updated public/private project visibility rules.
- [x] 4.4 Verify project time-entry list access uses the updated public/private project visibility rules.
- [x] 4.5 Verify GitHub extension project auto-create still gives the acting non-admin visibility to newly created private GitHub projects.

## 5. Tests

- [x] 5.1 Add unit coverage for PM `isActive` rejection and admin archive/unarchive through single-field patch payloads.
- [x] 5.2 Add e2e coverage for private default behavior and non-admin access denial to unassigned private projects.
- [x] 5.3 Add e2e coverage for public project access by unassigned PM/member users across project list/read/task/time-entry/timer flows.
- [x] 5.4 Add e2e coverage for derived `source` values from GitHub refs and manual projects.
- [x] 5.5 Add e2e coverage for `totalHours` using completed entries while excluding running entries.
- [x] 5.6 Add e2e coverage for management summary counts, including distinct counting of public assigned projects.
- [x] 5.7 Add e2e coverage for user summary `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`.

## 6. Verification And Documentation

- [x] 6.1 Update `docs/API-ENDPOINTS.md` and `docs/DATA-MODEL.md` to match the changed API/data-model behavior.
- [x] 6.2 Run `pnpm --filter @gitiempo/api lint`.
- [x] 6.3 Run `pnpm --filter @gitiempo/api typecheck`.
- [x] 6.4 Run `pnpm --filter @gitiempo/api test`.
- [x] 6.5 Run focused API e2e coverage if a test database is available.
- [x] 6.6 Run the build-based OpenAPI export workflow and update `packages/shared/openapi.json`.
