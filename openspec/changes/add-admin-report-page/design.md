## Context

`apps/admin-web/src/views/ReportsView.vue` is currently a `PlaceholderPage`, while the protected reports route already exists in the admin router and sidebar. The relevant source-of-truth files are `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/layout.md`, `docs/ui/components.md`, and `apps/admin-web/AGENTS.md`.

The approved Pencil screen is `GITiempo.pen` node `p2VXD` (`Admin Reports`). Its desktop structure is: shell content with `p-6`/24px spacing, a reports header with an `Export CSV` action, a four-field filter row, four summary cards, and a `SurfaceCard` results table with a right-aligned `Search report rows` input, filter row, and columns for project, member, hours, and billable hours.

The backend already exposes usable read paths for this page: `GET /projects` returns the current user's visible project scope and `GET /projects/:projectId/time-entries` lists visible project time entries with date/search pagination. This change must not modify `apps/api` or shared API contracts, so any report aggregation and CSV export happens in `admin-web`.

## Goals / Non-Goals

**Goals:**

- Replace the reports placeholder with a working admin-web page matching the approved `Admin Reports` design.
- Use existing shared visual primitives where they fit: `StatsHeader`, `StatCard`, `SurfaceCard`, and management table styling tokens.
- Use PrimeVue components for controls and data display, including `@primevue/forms` for the report filter form.
- Reuse existing API behavior and contract schemas from `@gitiempo/shared` without backend changes.
- Keep PM users inside the project scope returned by existing project/time-entry endpoints.
- Provide loading, empty, request-error, filtered, and export-ready states.

**Non-Goals:**

- No new report, member-filter, aggregate, or CSV endpoints.
- No API, database, OpenAPI, or shared contract changes.
- No cross-app extraction unless implementation proves an existing shared component can be reused unchanged.
- No invoice or member/project management changes beyond any report-only imports of existing admin-web clients.

## Decisions

### Decision 1: Build the report from existing project time-entry endpoints

Use `adminProjectsClient.listProjects()` to load the visible project list, then fetch report entries through a new admin-web-only reports client method for `GET /projects/:projectId/time-entries`. For an `All projects` selection, fetch each visible project and page through results with `limit=100` until all pages are loaded.

Rationale: this satisfies the no-API-change constraint and preserves PM scope because the backend already restricts visible projects and project time entries.

Alternative considered: add a backend workspace report endpoint with server-side aggregation and CSV export. Rejected because the user explicitly requested no API changes and frontend-based CSV export.

### Decision 2: Keep report state in a focused admin-web composable

Add an app-local reports composable such as `useReportsData` to own loading state, debounced API-backed filter refresh, pagination fan-out, error handling, derived summary totals, and export row derivation. Keep `ReportsView.vue` as a composition surface that renders the header, filters, summary cards, and table.

Rationale: the reports page combines async fetching, filters, aggregation, and export. A focused composable avoids a route-level god component and keeps behavior testable.

Alternative considered: implement all state directly in `ReportsView.vue`, matching the current members/projects pages. Rejected because reports has more derived state and filter interactions than those pages.

### Decision 3: Derive member options from visible projects and entries

Do not call `GET /members` for the report page. Build member filter options from `ProjectResponse.members` and loaded `TimeEntryResponse.user` values.

Rationale: `GET /members` is admin-only, but reports must support PM scope. Project membership and time-entry users are already available through endpoints that respect the current user's visible scope.

Alternative considered: use `adminMembersClient.listMembers()` for member options. Rejected because PM users would receive a forbidden response and the page would depend on an admin-only endpoint.

### Decision 4: Use an app-local reports table with existing styling conventions

Create a reports table component with PrimeVue `DataTable`/`Column`, `filterDisplay="row"`, `filters`, `globalFilterFields`, sortable columns, and `IconField`/`InputText` global search placeholder `Search report rows`. Reuse `managementTableColumnPt` and the same tokenized table/header/body styling as other admin tables, but do not modify `packages/web-shared`.

Rationale: the existing `ManagementTableShell` gives the visual baseline used by members/projects but does not expose the full PrimeVue DataTable header/filter-row behavior required for reports. An app-local table can satisfy the report requirements while staying visually consistent.

Alternative considered: extend `ManagementTableShell` in `packages/web-shared`. Rejected because the user requested the change only for `admin-web`, and shared package changes would require cross-app verification.

### Decision 5: Use PrimeVue Forms for the page-level report filters

Implement the filter bar with `@primevue/forms` `Form`/field names and PrimeVue `Select`, `MultiSelect` or `Select`, and `DatePicker selectionMode="range"`. Validate date ordering with an app-local browser-only Zod schema. Apply project/date-range changes through a 300ms debounced refresh; apply member/group-by changes through frontend derivation from already loaded scoped rows.

Rationale: this follows the user's PrimeVue Forms requirement and keeps invalid date ranges from crossing the frontend API boundary.

Alternative considered: plain `v-model` fields without `@primevue/forms`. Rejected because the user explicitly required PrimeVue Forms for forms.

### Decision 6: Export the currently loaded/visible report rows in the frontend

Generate CSV in the browser from the same computed rows used by the report table, including project, member, hours, billable hours, billable status/share, and date range context. Escape CSV cells locally and download with a deterministic filename such as `gitiempo-reports-YYYY-MM-DD.csv`.

Rationale: this avoids backend/API changes and makes export match the user's current filter scope.

Alternative considered: add a backend CSV endpoint or reuse a non-existent API export path. Rejected because the API does not currently expose CSV export and the user requested frontend-based export.

### Decision 7: Extend the admin-web skeleton only

Add a `reports` variant to `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`, including the page header/action, four filter placeholders, four stat cards, table search, header/filter rows, and report table rows.

Rationale: this reuses the existing admin-web skeleton component while keeping the change scoped to admin-web.

Alternative considered: add a new shared skeleton component. Rejected because this page-specific skeleton is not yet a cross-app pattern.

## Planned File Changes

- `apps/admin-web/src/views/ReportsView.vue`: Replace placeholder with page composition, request-error state, `StatsHeader`, report filters, stat cards, and table card.
- `apps/admin-web/src/components/reports/ReportsFilterForm.vue`: PrimeVue Forms filter bar for project, member, date range, and group-by.
- `apps/admin-web/src/components/reports/ReportsTable.vue`: PrimeVue DataTable with sorting, global search, column filters, empty state, and report-specific columns.
- `apps/admin-web/src/composables/useReportsData.ts`: Fetch visible projects/time entries, debounce API-backed filters, derive rows and summary totals, and expose refresh/export data.
- `apps/admin-web/src/services/admin-reports-client.ts`: Admin-web-only client for existing project time-entry listing using `timeEntryListQuerySchema` and `timeEntryListResponseSchema`.
- `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`: Add `reports` skeleton variant.
- Focused tests under `apps/admin-web/src/**`: cover API path/query construction, summary/filters/export derivation, skeleton variant rendering, and route-level reports states.

## Risks / Trade-offs

- Fetching all visible project pages can be expensive for large workspaces -> Use 300ms debounce, existing page-size max of 100, scoped project selection, and visible-project restrictions; show loading and request errors distinctly.
- Frontend aggregation can differ from future backend report math -> Keep calculations simple and based directly on `TimeEntryResponse.durationSeconds`/`isBillable`, and avoid adding new persisted semantics.
- PM member options may not include members with no project association or no visible report data -> Derive options only from visible project memberships and loaded rows so PM users cannot widen scope beyond backend-visible projects.
- Existing DataTable CSV behavior may not include custom derived labels exactly as needed -> Generate CSV from computed export rows instead of relying on a backend endpoint or unverified API.
- `ManagementTableShell` cannot be reused directly with filter rows -> Reuse table styling conventions locally and document any remaining PrimeVue/design compromises during implementation review.

## Migration Plan

This is a frontend-only replacement of an existing placeholder route. Deploy with the normal admin-web build. Rollback is reverting the admin-web reports files to the placeholder route; no data migration or backend rollback is required.

## Open Questions

- None blocking. If the implementation finds that PrimeVue DataTable filter-row behavior prevents exact Pencil parity, keep the PrimeVue-accessible behavior and document the compromise in the final review.
