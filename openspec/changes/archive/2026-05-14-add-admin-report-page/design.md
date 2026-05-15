## Context

`apps/admin-web/src/views/ReportsView.vue` is currently a `PlaceholderPage`, while the protected reports route already exists in the admin router and sidebar. The relevant source-of-truth files are `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/layout.md`, `docs/ui/components.md`, and `apps/admin-web/AGENTS.md`.

The approved Pencil screen is `GITiempo.pen` node `p2VXD` (`Admin Reports`). Its desktop structure is: shell content with `p-6`/24px spacing, a reports header with an `Export CSV` action, a four-field filter row, four summary cards, and a `SurfaceCard` results table with a right-aligned `Search report rows` input, filter row, and columns for project, member, hours, and billable hours.

The backend already exposes usable read paths for this page: `GET /projects` returns the current user's visible project scope and `GET /projects/:projectId/time-entries` lists visible project time entries with date/search pagination. This change must not modify `apps/api` or shared API contracts, so any report aggregation and CSV export happens in `admin-web`.

## Goals / Non-Goals

**Goals:**

- Replace the reports placeholder with a working admin-web page matching the approved `Admin Reports` design.
- Update `docs/ui/pages-admin.md` so documented Reports behavior matches the setup-control/export model chosen by this change.
- Use existing shared visual primitives where they fit: `StatsHeader`, `StatCard`, `SurfaceCard`, `ManagementTableShell`, and management table styling tokens.
- Use PrimeVue components for controls and data display, including `@primevue/forms` for the report setup form.
- Reuse existing API behavior and contract schemas from `@gitiempo/shared` without backend changes.
- Keep PM users inside the project scope returned by existing project/time-entry endpoints.
- Provide loading, empty, request-error, filtered, and export-ready states.

**Non-Goals:**

- No new report, member-filter, aggregate, or CSV endpoints.
- No API, database, OpenAPI, or shared contract changes.
- No cross-app extraction or shared package modification; existing shared components may be imported unchanged.
- No invoice or member/project management changes beyond any report-only imports of existing admin-web clients.

## Decisions

### Decision 1: Build the report from existing project time-entry endpoints

Use `adminProjectsClient.listProjects()` to load the visible project list, then fetch report entries through a new admin-web-only reports client method for `GET /projects/:projectId/time-entries`. For the default `All projects` scope, fetch only visible projects that are active and already report tracked hours (`isActive && totalHours > 0`) so the default fan-out is bounded. If an admin explicitly selects a project returned by the visible project list, fetch that selected project even if it is inactive or has zero tracked hours so historical/ad hoc reports remain available. PM and member users remain limited to active visible projects returned by the existing backend visibility rules.

For each target project, request time entries sequentially with `limit=100` and page through results until all pages are loaded. Newer report requests supersede older responses through request identity checks. Backend throttling or workspace-size limits surface as request errors instead of widening scope or silently dropping project pages.

Rationale: this satisfies the no-API-change constraint and preserves PM scope because the backend already restricts visible projects and project time entries.

Alternative considered: add a backend workspace report endpoint with server-side aggregation and CSV export. Rejected because the user explicitly requested no API changes and frontend-based CSV export.

### Decision 2: Keep report state in a focused admin-web composable

Add an app-local reports composable such as `useReportsData` to own loading state, default report scope, pagination fan-out, stale-response guards, error handling, derived table rows, table filter helpers, summary totals, and export row generation. Keep `ReportsView.vue` as a composition surface that renders the header, report setup controls, summary cards, and table.

Rationale: the reports page combines async fetching, filters, aggregation, and export. A focused composable avoids a route-level god component and keeps behavior testable.

Alternative considered: implement all state directly in `ReportsView.vue`, matching the current members/projects pages. Rejected because reports has more derived state and filter interactions than those pages.

### Decision 3: Derive member options from visible projects and entries

Do not call `GET /members` for the report page. Build member filter options from `ProjectResponse.members` and loaded `TimeEntryResponse.user` values.

Rationale: `GET /members` is admin-only, but reports must support PM scope. Project membership and time-entry users are already available through endpoints that respect the current user's visible scope.

Alternative considered: use `adminMembersClient.listMembers()` for member options. Rejected because PM users would receive a forbidden response and the page would depend on an admin-only endpoint.

### Decision 4: Use an app-local reports table with the existing shared shell

Create a reports table component that uses the existing `ManagementTableShell` from `@gitiempo/web-shared` unchanged, PrimeVue `Column` body slots, `IconField`/`InputText` global search placeholder `Search report rows`, and a table filter slot with project, member, hours, and billable filters. The table uses stable derived row ordering from the reports composable. User-triggered sortable columns are intentionally not required for this change because the shared shell hides PrimeVue headers and the report requirement is discovery through search and filters.

Rationale: the existing `ManagementTableShell` gives the visual baseline used by members/projects and supports an app-local filter row without changing shared package behavior. This keeps reports visually consistent while avoiding cross-app package changes.

Alternative considered: extend `ManagementTableShell` in `packages/web-shared` for report-specific sorting/header behavior. Rejected because the user requested the change only for `admin-web`, and shared package changes would require cross-app verification.

### Decision 5: Use PrimeVue Forms for report setup controls

Implement the filter bar with `@primevue/forms` `Form`/field names, PrimeVue `Select`, and `DatePicker selectionMode="range"`. These controls are report-generation setup controls: project, member, date range, and group-by values are kept separate from the currently loaded results table and summary cards until the user exports. The export action passes the current setup values to the report composable, which fetches matching data through existing endpoints and generates export rows.

Date range input uses PrimeVue DatePicker with manual input disabled and app-local validation messaging if an invalid end-before-start range is represented. Invalid ranges must be blocked before building report queries: they must not trigger report fetch, CSV generation, or calls to existing project time-entry endpoints. The design does not require a backend or shared-contract change for date validation.

Rationale: this follows the user's PrimeVue Forms requirement, keeps the approved four-control header layout, and avoids conflating report generation setup with table-only discovery filters.

Alternative considered: plain `v-model` fields without `@primevue/forms`. Rejected because the user explicitly required PrimeVue Forms for forms.

### Decision 6: Export generated report rows in the frontend

Generate CSV in the browser from rows returned by the report composable for the current report setup controls, including project, member, tracked hours, billable hours, billable share, and entry count. Table global search and column filters do not change export scope; they only affect the visible table. Escape CSV cells locally and download with a deterministic filename such as `gitiempo-reports-YYYY-MM-DD.csv`.

Rationale: this avoids backend/API changes and makes export match the explicit report-generation setup rather than transient table discovery filters.

Alternative considered: add a backend CSV endpoint or reuse a non-existent API export path. Rejected because the API does not currently expose CSV export and the user requested frontend-based export.

### Decision 7: Extend the admin-web skeleton only

Add a `reports` variant to `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`, including the page header/action, four filter placeholders, four stat cards, table search, header/filter rows, and report table rows.

Rationale: this reuses the existing admin-web skeleton component while keeping the change scoped to admin-web.

Alternative considered: add a new shared skeleton component. Rejected because this page-specific skeleton is not yet a cross-app pattern.

## Planned File Changes

- `apps/admin-web/src/views/ReportsView.vue`: Replace placeholder with page composition, request-error state, `StatsHeader`, report setup controls, stat cards, and table card.
- `apps/admin-web/src/components/reports/ReportsFilterForm.vue`: PrimeVue Forms report setup bar for project, member, date range, and group-by.
- `apps/admin-web/src/components/reports/ReportsTable.vue`: Report table using the existing shared management-table shell with global search, column filters, empty state, and report-specific columns.
- `apps/admin-web/src/composables/useReportsData.ts`: Fetch visible projects/time entries, bound the default all-project scope, keep explicit inactive/empty project reports admin-only through backend-visible project scope, block invalid date ranges before API/export boundaries, guard stale responses, derive rows/table filters/summary totals, and expose refresh/export data.
- `apps/admin-web/src/services/admin-reports-client.ts`: Admin-web-only client for existing project time-entry listing using `timeEntryListQuerySchema` and `timeEntryListResponseSchema`.
- `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`: Add `reports` skeleton variant.
- `docs/ui/pages-admin.md`: Update Reports Page requirements from real-time page filters to report setup controls plus table-only discovery filters.
- Focused tests under `apps/admin-web/src/**`: cover API path/query construction, bounded project scope, admin-only explicit inactive/empty project reporting, invalid date blocking before API/export, summary/table-filter/export derivation, report setup versus table state separation, skeleton variant rendering, and route-level reports states.

## Risks / Trade-offs

- Fetching all visible project pages can be expensive for large workspaces -> Bound the default all-project scope to active visible projects with tracked hours, fetch sequentially with the existing page-size max of 100, allow explicit selected-project reports, ignore stale responses, and show throttling/request errors distinctly.
- Header report setup controls and table discovery filters can be confused -> Keep their behavior explicit in specs and tests: setup controls drive CSV generation, while table filters only affect visible table rows.
- Frontend aggregation can differ from future backend report math -> Keep calculations simple and based directly on `TimeEntryResponse.durationSeconds`/`isBillable`, and avoid adding new persisted semantics.
- PM member options may not include members with no project association or no visible report data -> Derive options only from visible project memberships and loaded rows so PM users cannot widen scope beyond backend-visible projects.
- Existing DataTable CSV behavior may not include custom derived labels exactly as needed -> Generate CSV from computed export rows instead of relying on a backend endpoint or unverified API.
- `ManagementTableShell` hides PrimeVue headers -> Use stable derived ordering and table discovery filters instead of requiring user-triggered sorting.

## Migration Plan

This is a frontend-only replacement of an existing placeholder route. Deploy with the normal admin-web build. Rollback is reverting the admin-web reports files to the placeholder route; no data migration or backend rollback is required.

## Open Questions

- None blocking. If the implementation finds that PrimeVue DataTable filter-row behavior prevents exact Pencil parity, keep the PrimeVue-accessible behavior and document the compromise in the final review.
