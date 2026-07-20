## Context

The reports pipeline is contract-first: `packages/shared/src/contracts/reports.ts` defined `groupBy` as a single enum (`project | task | user`), `apps/api/src/reports/services/reports.service.ts` built one `GROUP BY` per dimension and returned a discriminated-union row (`TimeReportRow`), and `apps/admin-web` rendered a flat table from those rows with filters only under the project, member, hours, and billable columns and a single `Export CSV` action. The approved design (GITiempo.pen: "Admin Reports V2" frame, "Report Filter Menus Spec" frame, "Report PDF Preview" frame) requires an ordered, configurable grouping of up to 4 levels rendered as an expandable tree with per-level subtotals, a filter under every column with fixed option sets, and a styled PDF export (purple accent bar, GiTiempo masthead with "TIME REPORT", period + workspace line, filters/grouping line, summary strip, the grouped table fully expanded with tinted top-level subtotal rows and indented child rows, a rule-topped total row, and a generated-by footer with page numbers).

Per `apps/api/AGENTS.md`: contract-facing changes must update `packages/shared/src/contracts/*` and regenerate `packages/shared/openapi.json` (via the build-based workflow — `pnpm openapi:export` through tsx is currently broken for DI, see the AGENTS.md gotcha). Per `apps/admin-web/AGENTS.md`: follow `docs/ui/INDEX.md` first, implement pixel-perfect to the approved `.pen` screen, prefer PrimeVue components, and keep contract validation in shared Zod schemas. Per the pnpm policy, dependencies are added without re-resolving the committed lockfile.

## Goals / Non-Goals

**Goals:**

- Ordered multi-level `groupBy` (1–4 unique dimensions of `project`, `user`, `task`) accepted by `GET /reports/time` and `GET /reports/time/export`.
- Single-dimension requests keep today's semantics (backward-compatible degenerate case).
- Admin reports page: grouping-builder chips (add, remove, reorder, max 4) and an expandable tree table with per-level subtotals, per the V2 design.
- `billableShare` (`any | below50 | gte50 | gte90`) and `activity` (`any | today | last7 | last30`) filters, desktop and mobile. (Revised: the entries column and filter were removed at the user's request.)
- `format=pdf` on the existing export endpoint returning the designed PDF; `format=csv` (default) stays the detailed export, now carrying the joined grouping path as metadata.
- Reports page export menu (CSV / PDF) per the design's split Export control; export blocking extends to the new filters.
- PM scope, summary cards, date defaults, and search behavior unchanged.

**Non-Goals:**

- Saved report presets (separate change from the same redesign; the PDF title stays "Time report" until then).
- New grouping dimensions (e.g. date/week) — the dimension set stays `project | user | task`.
- Backend filtering for the table-only column filters, or free-form numeric/date filter inputs — the design fixes preset options.
- Filtering nested (non-top-level) tree nodes independently — a qualifying group keeps its whole subtree.
- Pixel-exact Inter typography in the PDF — pdfmake embeds no webfonts by default; the PDF uses the standard Helvetica family (closest metric-compatible standard font). Recorded as a deviation from the .pen design.
- Charts or per-page column re-flow beyond pdfmake's table layout.

## Decisions

### D1: `groupBy` is a comma-separated ordered list in the query string

`groupBy=project,user,task`. The Zod contract parses the string into a validated array (`1–4` items, unique, each in the enum). A bare `groupBy=project` parses to `['project']`, so existing clients and bookmarks keep working, and the OpenAPI surface stays a single query parameter.

- Alternative — repeated params (`groupBy=a&groupBy=b`): rejected; NestJS/Zod handling of mixed single/array query params is messier and the OpenAPI diff is larger.
- Alternative — new parameter (`groupPath`) alongside legacy `groupBy`: rejected; two overlapping parameters would need precedence rules forever, and admin-web is the only consumer.

### D2: Response returns leaf rows keyed by the full grouping path; pagination is by top-level group

Each response row carries identity objects for every requested dimension (`project`, `task`, `user` — non-requested ones stay `null`), replacing the discriminated union with one unified row shape (**BREAKING** for `TimeReportRow`; admin-web migrates in this change). `task` identity always includes its `project` summary, as today.

Pagination changes unit: `page`/`limit` select top-level groups (ordered by `sortBy` aggregated at the top level), and the response contains the *complete subtree* of leaf rows for those groups. `meta.total` counts top-level groups.

Rationale: parent subtotals must be exact. Paginating raw leaves would truncate subtrees and make client-side subtotals lie; returning server-computed subtotal rows for every level would bloat the payload and complicate sorting. With whole subtrees per page, the client can derive every intermediate subtotal by integer summation of leaf seconds — deterministic and cheap.

Implementation: two-step query in `ReportsService` — (1) subquery selecting the page of top-level group keys ordered by the aggregated sort metric, (2) main aggregate query grouped by all path columns, filtered to those keys. Single-level requests skip step 2's extra columns and behave identically to today.

### D3: Tree assembly, subtotals, and expansion live in the admin-web view model, rendered through the existing DataTable shell

`report-view-model.ts` gains a `buildReportTree(rows, grouping)` step that groups leaf rows by the path, computes node subtotals (sum of leaf `totalSeconds`/`billableSeconds`, max `lastStartedAt`), and flattens the tree into display rows carrying `{ level, isLeaf, expanded }`. `ReportsTable.vue` keeps `ManagementTableShell`/DataTable and renders the flattened list with indentation and chevron toggles, exactly like the V2 design.

- Alternative — PrimeVue `TreeTable`: rejected; it abandons `ManagementTableShell` (shared header/filter/skeleton/mobile patterns and their tests) and restyling TreeTable to pixel-parity costs more than flattening rows in the view model, which is already the page's pattern (pure functions + spec files).

### D4: CSV export stays detailed; the grouping path is metadata only

The reports-api spec deliberately requires CSV rows to stay at detailed project-task-user granularity for every `groupBy` ("CSV groupBy does not collapse detailed rows"), and the redesign never asked to change export granularity. The export endpoint therefore accepts the same ordered `groupBy` list but keeps emitting detailed rows; the `Group By` CSV column records the joined ordered path (e.g. `project>user>task`).

- Alternative — emit rows at the requested path granularity so "the file matches the table": rejected; it would reverse a recently-strengthened spec requirement, and the detailed export already contains every level of any on-screen tree (multi-level leaf rows are a coarsening of project×task×user).

### D5: Grouping state is an ordered array end-to-end

Admin-web `ReportGrouping` type changes from `'project' | 'member'` to an ordered array of `'project' | 'member' | 'task'` (UI vocabulary; mapped to API `user` via the existing `reportGroupingApiValue` mapping). Default stays `['project']`. The grouping builder enforces uniqueness and the 4-level cap; "Add level" offers only unused dimensions.

### D6: Aggregate column filters compare displayed top-level group totals

(Revised during implementation.) The primary rows show group subtotals, so testing invisible leaf aggregates could never match the on-screen numbers. `filterReportTreeGroups(nodes, filters, now)` keeps top-level groups whose own totals satisfy every aggregate filter (hours, billable, billable %, activity) and preserves their subtrees; `sumReportTreeTotals` feeds the total row from the visible groups. Identity filters and global search stay leaf-level in `filterReportRows`, after which the visible tree and subtotals are rebuilt from surviving leaves.

`filterReportTreeGroups` takes an optional `now` (default `new Date()`) so the activity filter is deterministic in tests. "Today" means the local calendar day of `now`; "Last 7/30 days" means `lastStartedAt >= now - 7/30 days`.

The blocked-export rule stays one sentence: any of `hours`, `billable`, `billableShare`, `activity`, or `global` being active blocks the export with the existing message (extended wording: "Search and column filters…"). The member-filter/grouping rule is untouched (a member filter is representable whenever `user`/`member` is one of the requested levels).

### D7: `pdfmake` over pdfkit/puppeteer for the PDF export

Declarative table layout with automatic page breaks, repeatable header rows, per-row fill colors, and footer callbacks with page numbers — everything the design needs — without a headless browser on the VPS. pdfkit would mean hand-rolled pagination; puppeteer is a Chromium-sized dependency for one document.

### D8: One export endpoint, `format` parameter

The PDF must share filters, PM scope, and date defaults with the CSV; a `format` enum on `timeReportExportQuerySchema` (default `csv`) keeps one code path for context building and keeps existing clients working unchanged.

### D9: Server-side tree assembly for the PDF

The PDF needs per-level subtotal rows, so the service groups the path-granularity leaf rows level by level (same fold the admin table does client-side) and emits one table row per node, indented per level, with top-level rows tinted (`#F5F0FA`) as in the design. The PDF query reuses the grouped query without pagination — the export already reads the full result set for CSV, and reports are bounded by the workspace's completed entries in the window.

## Risks / Trade-offs

- [Two-step aggregate query is heavier than today's single group-by] → top-level page is capped at `limit ≤ 100`; joins/indexes are unchanged; single-level requests keep the one-step path. Verify with the existing e2e seed data timings.
- [Whole-subtree pages have unbounded leaf counts (top-level page × members × tasks)] → acceptable at current workspace scale; default `limit` 20; revisit with leaf-count cap if payloads grow. Document in the spec that leaf rows per page are not independently paginated.
- [**BREAKING** `TimeReportRow` union removal ripples through admin-web view model, validation schemas, and tests] → admin-web is the only consumer; migrate and regenerate `openapi.json` in the same change (build-based export per `apps/api/AGENTS.md` gotcha).
- [Export-blocked-reason rules must understand the grouping array and the new filters] → `getReportExportBlockedReason` becomes grouping-path-aware and covers the new aggregate filters; covered by existing view-model spec files.
- [Drag-to-reorder chips can be fiddly across browsers] → functional fallback: reorder buttons on each chip; the design's grip icon remains as affordance. Call out any PrimeVue-forced deviation in the final review per `apps/admin-web/AGENTS.md`.
- [Sorting semantics within subtrees] → server orders leaves by path then `sortBy`; the client orders siblings at every level by the same metric on subtotals, so the visible order is consistent even though the server does not emit subtotal rows.
- [Timezone edges on "Today"] → local-day comparison via the same date helpers the app already uses (`getLocalDateKey`), matching how users read the Last activity column (`formatLocalCalendarDate`).
- [Filter row width creep] → controls reuse the compact 12px select treatment already present for hours/billable; column widths are unchanged.
- [pdfmake standard fonts have no glyphs for some scripts] → workspace/project names are workspace-controlled Latin/Cyrillic text; Helvetica (WinAnsi) covers Latin; non-encodable glyphs degrade — acceptable for v1, note for follow-up if workspaces need full Unicode (would ship an embedded TTF).
- [Long PDF tables spanning pages] → pdfmake `headerRows: 1` repeats the column header per page; the footer callback stamps `Page X of Y`.
- [Adding a dependency under `minimumReleaseAge`] → add pdfmake with a resolution scoped to the new package; verify the lockfile diff stays scoped to pdfmake before committing.

## Planned file changes

**packages/shared**

- `src/contracts/reports.ts`: `groupBy` list schema (comma-string → array transform), unified `timeReportRowSchema`, response `groupBy: array`, `timeReportExportFormatSchema` + export query `format` field, updated exports; `src/contracts/reports.spec.ts`.
- `openapi.json`: regenerated (build-based workflow).

**apps/api**

- `package.json`: `pdfmake` dependency (lockfile diff scoped to the new package).
- `src/reports/services/reports.service.ts`: path-based `groupByColumns`/`groupSelection`, two-step top-level pagination, `toReportRow` for unified shape, `toCsv` path metadata, `exportTimeReport` branching on format (PDF builds the grouped tree); `reports.service.spec.ts`.
- `src/reports/services/report-pdf.ts` (new): PDF document builder per the "Report PDF Preview" frame; spec file.
- `src/reports/dto/time-report-query.dto.ts`, `dto/time-report-export-query.dto.ts`, `dto/time-report-response.dto.ts`: re-wrap updated contracts.
- `src/reports/controllers/reports.controller.ts`: per-format content type and disposition.
- e2e coverage for multi-level grouping, scoped PM subtree correctness, and PDF export.

**apps/admin-web**

- `src/validation/report-view-model.ts` + `src/lib/report-view-model.ts`: grouping array, tree build/flatten/subtotals, new filter enums and predicates, export-blocked-reason update; spec files.
- `src/components/reports/ReportsTable.vue`: grouping-builder chips row, tree rendering (indent, chevrons, subtotal rows, total footer), new columns (billable %, last activity), full filter row (desktop + mobile) per the V2 design; `ReportsTable.spec.ts`.
- `src/views/ReportsView.vue`: `Export ▾` menu (PrimeVue Menu) replacing the single button; `ReportsView.spec.ts`.
- `src/composables/reports/useReportsData.ts`, `useReportOptions.ts`, `useReportExport.ts`, `src/services/admin-reports-client.ts`: thread the grouping array, unified rows, and export `format`; spec files.

**docs**

- `docs/ui/pages-admin.md`: reports page grouping, filter, and export documentation.

## Backend/frontend coordination

The contract change lands first in `packages/shared` (single source for both layers); API and admin-web build against it in the same change so nothing ships against a stale row shape. Because `groupBy=project` still parses as a one-element list, `format` defaults to `csv`, and the response for single-level requests is shape-compatible after the union → unified-row migration, the API can deploy before the new UI without breaking existing clients — but admin-web must migrate its row parsing in the same release, hence one change, one PR. OpenAPI regeneration follows the API DTO update per `apps/api/AGENTS.md`.

## Open Questions

- None blocking. Drag-vs-buttons reorder was resolved during implementation per D5/Risks (HTML5 drag with per-chip remove shipped).
