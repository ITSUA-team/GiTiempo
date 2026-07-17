## Context

`GET /reports/time/export` builds a scoped query context and streams a detailed CSV. The approved "Report PDF Preview" .pen frame defines the PDF layout: purple accent bar, GiTiempo masthead with "TIME REPORT", period + workspace line, filters/grouping line, four-stat summary strip, the grouped table fully expanded with tinted top-level subtotal rows and indented child rows, a rule-topped total row, and a generated-by footer with page numbers. Per `apps/api/AGENTS.md`, contract changes flow through `packages/shared` and the OpenAPI export regenerates via the build-based workflow. Per the pnpm policy, dependencies are added without re-resolving the committed lockfile.

## Goals / Non-Goals

**Goals:**

- `format=pdf` on the existing export endpoint returning the designed PDF; `format=csv` (default) byte-identical to today.
- PDF rows follow the requested ordered grouping path with per-level subtotals, matching what the reports table displays when fully expanded.
- Reports page export menu (CSV / PDF) per the design's split Export control.

**Non-Goals:**

- Saved-report titles in the PDF (saved reports are a future change; the title is "Time report").
- Pixel-exact Inter typography — pdfmake embeds no webfonts by default; the PDF uses the standard Helvetica family (closest metric-compatible standard font). Recorded as a deviation from the .pen design.
- Charts or per-page column re-flow beyond pdfmake's table layout.

## Decisions

- **`pdfmake` over pdfkit/puppeteer**: declarative table layout with automatic page breaks, repeatable header rows, per-row fill colors, and footer callbacks with page numbers — everything the design needs — without a headless browser on the VPS. pdfkit would mean hand-rolled pagination; puppeteer is a Chromium-sized dependency for one document.
- **One endpoint, `format` parameter**: the PDF must share filters, PM scope, and date defaults with the CSV; a `format` enum on `timeReportExportQuerySchema` (default `csv`) keeps one code path for context building and keeps existing clients working unchanged.
- **Server-side tree assembly**: the PDF needs per-level subtotal rows, so the service groups the path-granularity leaf rows level by level (same fold the admin table does client-side) and emits one table row per node, indented per level, with top-level rows tinted (`#F5F0FA`) as in the design.
- **Data volume**: the PDF query reuses the grouped query without pagination — the export already reads the full result set for CSV, and reports are bounded by the workspace's completed entries in the window.

## Risks / Trade-offs

- [pdfmake standard fonts have no glyphs for some scripts] → workspace/project names are workspace-controlled Latin/Cyrillic text; Helvetica (WinAnsi) covers Latin; non-encodable glyphs degrade — acceptable for v1, note for follow-up if workspaces need full Unicode (would ship an embedded TTF).
- [Long tables spanning pages] → pdfmake `headerRows: 1` repeats the column header per page; the footer callback stamps `Page X of Y`.
- [Adding a dependency under `minimumReleaseAge`] → `pnpm add --filter @gitiempo/api` resolves only the new package; verify the lockfile diff stays scoped to pdfmake before committing.

## Planned file changes

**packages/shared**: `src/contracts/reports.ts` (`timeReportExportFormatSchema`, `format` field), contract spec, regenerated `openapi.json`.

**apps/api**: `package.json` (+pdfmake), `src/reports/services/report-pdf.ts` (document builder), `reports.service.ts` (`exportTimeReport` returns content+filename+contentType per format, PDF branch builds the tree), `reports.controller.ts` (content type/disposition), unit + e2e coverage.

**apps/admin-web**: `admin-reports-client.ts` (format param, blob content type), `ReportsView.vue` (Export menu via PrimeVue Menu, per-format success toasts), spec files.

**docs**: `docs/ui/pages-admin.md` export bullets.

## Backend/frontend coordination

The `format` field defaults to `csv` in the shared contract, so the API deploys safely before the UI; the admin-web menu lands in the same change. OpenAPI regenerates after the DTO change.
