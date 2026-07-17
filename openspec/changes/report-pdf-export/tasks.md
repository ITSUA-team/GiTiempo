## 1. Dependency and contract

- [x] 1.1 Add `pdfmake` to `apps/api` with a lockfile diff scoped to the new package (per the pnpm minimumReleaseAge policy)
- [x] 1.2 Add `timeReportExportFormatSchema` (`csv | pdf`, default `csv`) to the shared export query contract; update the contract spec
- [x] 1.3 Build shared and confirm dependents typecheck

## 2. API PDF export

- [x] 2.1 Implement the PDF document builder (`report-pdf.ts`): masthead, period/workspace line, filters + grouping line, summary strip, grouped table with per-level subtotals and indentation, total row, footer with generation date and page numbers, per the "Report PDF Preview" .pen frame
- [x] 2.2 Extend `ReportsService.exportTimeReport` to branch on format: CSV unchanged; PDF builds the grouped tree from path-granularity rows and returns a PDF buffer with a `.pdf` filename
- [x] 2.3 Wire the controller response (content type and disposition per format)
- [x] 2.4 Unit coverage: format branching, PDF magic bytes, filename; e2e coverage: admin PDF 200 + content type, default stays CSV, PM scope, invalid format 400
- [x] 2.5 Regenerate `packages/shared/openapi.json` via the build-based workflow

## 3. Admin web export menu

- [x] 3.1 Pass `format` through `admin-reports-client` and `useReportExport`
- [x] 3.2 Replace the `Export CSV` button in `ReportsView.vue` with the design's `Export ▾` menu ("Export as CSV" / "Export as PDF"), keeping the blocked-reason tooltip and download flow
- [x] 3.3 Update `ReportsView.spec.ts` and client spec for the menu and format param

## 4. Docs and verification

- [x] 4.1 Update `docs/ui/pages-admin.md` export bullets
- [x] 4.2 API: lint, typecheck, unit tests, reports e2e; admin-web: lint, typecheck, tests
