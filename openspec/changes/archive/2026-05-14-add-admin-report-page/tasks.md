## 1. Preparation

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/layout.md`, `docs/ui/components.md`, and `apps/admin-web/AGENTS.md` before implementation.
- [x] 1.2 Re-inspect `GITiempo.pen` node `p2VXD` (`Admin Reports`) and record the desktop parity checklist for header, filters, stats, table, loading, empty, and error states.
- [x] 1.3 Re-inspect existing admin members/projects table, form, skeleton, toast, and error-state patterns to reuse app-local conventions without modifying `apps/api`.

## 2. Data And State

- [x] 2.1 Add an admin-web reports client for existing `GET /projects/:projectId/time-entries` using shared `timeEntryListQuerySchema` and `timeEntryListResponseSchema`.
- [x] 2.2 Add reports client tests for request path, auth header, query serialization, response parsing, pagination inputs, and API error propagation.
- [x] 2.3 Add an app-local reports composable that loads visible projects, bounds the default all-project scope to active projects with tracked hours, keeps explicit inactive/empty project reports admin-only through backend-visible project scope, fetches paginated project entries with `limit=100`, handles stale responses/request errors distinctly, and exposes retry/refresh behavior.
- [x] 2.4 Keep header report setup controls independent from loaded table state; use them for generated CSV scope while table discovery filters remain frontend-only.
- [x] 2.5 Derive PM-safe project and member filter options only from existing visible project data and loaded report rows.
- [x] 2.6 Derive loaded report table rows, grouped generated export rows, summary totals, empty-state flags, and table filter helpers from `TimeEntryResponse` data.
- [x] 2.7 Add frontend CSV generation/download behavior for the current header report setup controls with proper cell escaping and deterministic filename.
- [x] 2.8 Add focused tests for table filter derivation, summary totals, PM-safe options, bounded default project scope, admin-only explicit inactive/empty project reporting, invalid date blocking before API/export, request-error versus empty-state behavior, header setup versus table state separation, and CSV output.

## 3. Reports UI

- [x] 3.1 Extend `ManagementPageSkeleton` with a `reports` variant matching the approved reports page structure.
- [x] 3.2 Build `ReportsFilterForm.vue` with `@primevue/forms`, PrimeVue `Select`/`MultiSelect` or `Select`, PrimeVue `DatePicker` range selection, app-local validation that blocks invalid ranges before API/export boundaries, and token-based Tailwind classes.
- [x] 3.3 Build `ReportsTable.vue` with the existing shared management-table shell, PrimeVue `Column` body slots, global search placeholder `Search report rows`, column filters for project/member/hours/billable where controls are available, stable derived row ordering, and the standard empty state.
- [x] 3.4 Replace `ReportsView.vue` placeholder with a thin composition surface using `StatsHeader`, `StatCard`, `SurfaceCard`, the reports filter form, reports table, CSV export action, skeleton, and request-error retry state.
- [x] 3.5 Ensure the desktop layout matches `GITiempo.pen` node `p2VXD` for spacing, ordering, typography, card radii, action hierarchy, and table structure; adapt responsively for mobile without changing information hierarchy.
- [x] 3.6 Confirm no backend/API, shared contract, or cross-app shared package changes were introduced; reuse `@gitiempo/web-shared` components unchanged.
- [x] 3.7 Update `docs/ui/pages-admin.md` so the Reports Page source-of-truth documents report setup controls, table-only discovery filters, stable ordering, and CSV scope.

## 4. Verification

- [x] 4.1 Add or update focused admin-web component/view tests for loading skeleton, successful reports rendering, header setup/export behavior, invalid date export blocking, table search/filter controls, CSV export action, request-error retry, and empty filtered results.
- [x] 4.2 Run `pnpm --filter admin-web test` and fix failures.
- [x] 4.3 Run `pnpm --filter admin-web lint` and fix newly introduced lint warnings or errors.
- [x] 4.4 Run `pnpm --filter admin-web typecheck` and fix type errors.
- [x] 4.5 Run the admin-web page locally if needed and perform final design parity review against `GITiempo.pen` node `p2VXD`, documenting any PrimeVue-only compromises.
- [x] 4.6 Confirmed no `packages/web-shared` changes are part of this change; run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck` only if a future edit touches shared frontend packages.
