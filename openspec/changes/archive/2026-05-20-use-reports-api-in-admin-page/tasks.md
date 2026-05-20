## 1. Reports API Client

- [x] 1.1 Extend `apps/admin-web/src/services/admin-reports-client.ts` with `getTimeReport` and `exportTimeReport` methods for the backend reports API.
- [x] 1.2 Update reports client tests for query serialization, response parsing, CSV Blob download metadata, and API error propagation.

## 2. Reports View Model And Composable

- [x] 2.1 Remove stale frontend aggregation/schema files and replace them with Zod-validated table row display mapping, date conversion, formatting, and table-filter defaults only.
- [x] 2.2 Refactor `useReportsData` to load selector options from projects, load project-member table rows from backend report responses, debounce valid table project/date refreshes, ignore stale responses, and keep member/table filters local.
- [x] 2.3 Update composable tests for initial table load, setup-control export scope, invalid date blocking, stale/error handling, and PM-scope selector behavior.

## 3. Reports UI Wiring

- [x] 3.1 Update `ReportsFilterForm` to use shared report group values, PrimeVue Forms validation, and no local report form schema.
- [x] 3.2 Update `ReportsView` to keep setup controls as backend export scope and preserve frontend table state.
- [x] 3.3 Update `ReportsTable` and tests to render project-member row variants while preserving search and column-filter behavior.
- [x] 3.4 Update `ReportsView` tests for skeleton, request-error, table rendering, invalid-date export blocking, empty-export feedback, and backend CSV export success/failure.

## 4. Documentation And Verification

- [x] 4.1 Update `docs/ui/pages-admin.md` Reports wording from frontend CSV generation to backend CSV export while keeping table data semantics.
- [x] 4.2 Run `pnpm --filter admin-web test`.
- [x] 4.3 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck`.
- [x] 4.4 Run `openspec validate use-reports-api-in-admin-page --strict` and confirm all tasks are complete.
