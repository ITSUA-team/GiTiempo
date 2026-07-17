## Context

The reports pipeline is contract-first: `packages/shared/src/contracts/reports.ts` defines `groupBy` as a single enum (`project | task | user`), `apps/api/src/reports/services/reports.service.ts` builds one `GROUP BY` per dimension and returns a discriminated-union row (`TimeReportRow`), and `apps/admin-web` renders a flat table from those rows. The approved design (GITiempo.pen, "Admin Reports V2" frame) requires an ordered, configurable grouping of up to 4 levels (e.g. Project › Member › Task) rendered as an expandable tree with per-level subtotals, plus a grouping-aware CSV export.

Per `apps/api/AGENTS.md`: contract-facing changes must update `packages/shared/src/contracts/*` and regenerate `packages/shared/openapi.json` (via the build-based workflow — `pnpm openapi:export` through tsx is currently broken for DI, see the AGENTS.md gotcha). Per `apps/admin-web/AGENTS.md`: follow `docs/ui/INDEX.md` first, implement pixel-perfect to the approved `.pen` screen, prefer PrimeVue components, and keep contract validation in shared Zod schemas.

## Goals / Non-Goals

**Goals:**

- Ordered multi-level `groupBy` (1–4 unique dimensions of `project`, `user`, `task`) accepted by `GET /reports/time` and `GET /reports/time/export`.
- Single-dimension requests keep today's semantics (backward-compatible degenerate case).
- Admin reports page: grouping-builder chips (add, remove, reorder, max 4) and an expandable tree table with per-level subtotals, per the V2 design.
- CSV export rows match the on-screen grouping granularity and order.
- PM scope, summary cards, date defaults, and search behavior unchanged.

**Non-Goals:**

- Saved report presets and PDF export (separate changes from the same redesign).
- New grouping dimensions (e.g. date/week) — the dimension set stays `project | user | task`.
- Drag-and-drop reordering polish beyond functional reorder controls (the design's grip affordance may ship as up/down or left/right move actions if drag proves costly; see Risks).

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

`report-view-model.ts` gains a `buildReportTree(rows, grouping)` step that groups leaf rows by the path, computes node subtotals (sum of leaf `totalSeconds`/`billableSeconds`/`entryCount`, max `lastStartedAt`), and flattens the tree into display rows carrying `{ level, isLeaf, expanded }`. `ReportsTable.vue` keeps `ManagementTableShell`/DataTable and renders the flattened list with indentation and chevron toggles, exactly like the V2 design.

- Alternative — PrimeVue `TreeTable`: rejected; it abandons `ManagementTableShell` (shared header/filter/skeleton/mobile patterns and their tests) and restyling TreeTable to pixel-parity costs more than flattening rows in the view model, which is already the page's pattern (pure functions + spec files).

Table filters (project/member/hours/billable/global search) keep operating table-only: they filter leaf rows first, then the tree is rebuilt from surviving leaves so subtotals always match what is visible.

### D4: CSV export stays detailed; the grouping path is metadata only

The reports-api spec deliberately requires CSV rows to stay at detailed project-task-user granularity for every `groupBy` ("CSV groupBy does not collapse detailed rows"), and the redesign never asked to change export granularity. The export endpoint therefore accepts the same ordered `groupBy` list but keeps emitting detailed rows; the `Group By` CSV column records the joined ordered path (e.g. `project>user>task`).

- Alternative — emit rows at the requested path granularity so "the file matches the table": rejected; it would reverse a recently-strengthened spec requirement, and the detailed export already contains every level of any on-screen tree (multi-level leaf rows are a coarsening of project×task×user). Existing export-blocked-reason logic in `report-view-model.ts` keeps its current role.

### D5: Grouping state is an ordered array end-to-end

Admin-web `ReportGrouping` type changes from `'project' | 'member'` to an ordered array of `'project' | 'member' | 'task'` (UI vocabulary; mapped to API `user` via the existing `reportGroupingApiValue` mapping). Default stays `['project']`. The grouping builder enforces uniqueness and the 4-level cap; "Add level" offers only unused dimensions.

## Risks / Trade-offs

- [Two-step aggregate query is heavier than today's single group-by] → top-level page is capped at `limit ≤ 100`; joins/indexes are unchanged; single-level requests keep the one-step path. Verify with the existing e2e seed data timings.
- [Whole-subtree pages have unbounded leaf counts (top-level page × members × tasks)] → acceptable at current workspace scale; default `limit` 20; revisit with leaf-count cap if payloads grow. Document in the spec that leaf rows per page are not independently paginated.
- [**BREAKING** `TimeReportRow` union removal ripples through admin-web view model, validation schemas, and tests] → admin-web is the only consumer; migrate and regenerate `openapi.json` in the same change (build-based export per `apps/api/AGENTS.md` gotcha).
- [Export-blocked-reason rules must understand the grouping array] → `getReportExportBlockedReason` becomes grouping-path-aware (a member filter is representable whenever `user` is one of the requested levels); covered by existing view-model spec files.
- [Drag-to-reorder chips can be fiddly across browsers] → functional fallback: reorder buttons on each chip; the design's grip icon remains as affordance. Call out any PrimeVue-forced deviation in the final review per `apps/admin-web/AGENTS.md`.
- [Sorting semantics within subtrees] → server orders leaves by path then `sortBy`; the client orders siblings at every level by the same metric on subtotals, so the visible order is consistent even though the server does not emit subtotal rows.

## Planned file changes

**packages/shared**

- `src/contracts/reports.ts`: `groupBy` list schema (comma-string → array transform), unified `timeReportRowSchema`, response `groupBy: array`, updated exports; `src/contracts/reports.spec.ts`.
- `openapi.json`: regenerated (build-based workflow).

**apps/api**

- `src/reports/services/reports.service.ts`: path-based `groupByColumns`/`groupSelection`, two-step top-level pagination, `toReportRow` for unified shape, `toCsv` path granularity + ordering; `reports.service.spec.ts`.
- `src/reports/dto/time-report-query.dto.ts`, `dto/time-report-export-query.dto.ts`, `dto/time-report-response.dto.ts`: re-wrap updated contracts.
- e2e coverage for multi-level grouping and scoped PM subtree correctness.

**apps/admin-web**

- `src/validation/report-view-model.ts` + `src/lib/report-view-model.ts`: grouping array, tree build/flatten/subtotals, export-blocked-reason update; spec files.
- `src/components/reports/ReportsTable.vue`: grouping-builder chips row, tree rendering (indent, chevrons, subtotal rows, total footer), new columns (entries, billable %, last activity) per the V2 design; `ReportsTable.spec.ts`.
- `src/views/ReportsView.vue`, `src/composables/reports/useReportsData.ts`, `useReportOptions.ts`, `useReportExport.ts`, `src/services/admin-reports-client.ts`: thread the grouping array and unified rows; spec files.

## Backend/frontend coordination

The contract change lands first in `packages/shared` (single source for both layers); API and admin-web build against it in the same change so nothing ships against a stale row shape. Because `groupBy=project` still parses as a one-element list and the response for single-level requests is shape-compatible after the union → unified-row migration, the API can deploy before the new UI without breaking the current page build only if admin-web migrates its row parsing in the same release — hence one change, one PR. OpenAPI regeneration follows the API DTO update per `apps/api/AGENTS.md`.

## Open Questions

- None blocking. Drag-vs-buttons reorder is resolved during implementation per D5/Risks.
