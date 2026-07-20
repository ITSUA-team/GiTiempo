## Why

The reports redesign (issue #309) shipped configurable multi-level grouping, a filter under every column, and CSV/PDF export, but every one of those choices is lost on reload. Rebuilding "billable hours by project then member, this month, excluding non-billable" from scratch each time is the friction the redesign was meant to remove, and the approved design already carries the answer: the `savedReportsBar` frame in GITiempo.pen "Admin Reports V2" puts named report presets as pill tabs across the top of the page, with an active tab, an unsaved-changes indicator, `Save`, `Save as new…`, and `New report`.

Saved presets were deliberately deferred out of the `admin-reports-redesign` change. This change implements them.

## What Changes

- New `saved_reports` capability: named report presets stored per workspace, listed, created, updated, renamed, and deleted through a protected API with the same admin/PM authorization as the rest of the reports surface.
- Presets are **shared across the workspace**: every user who can reach the reports page sees the same tabs, and any admin or PM can overwrite or delete one. Names are unique per workspace.
- A preset captures the full report view: date range, ordered grouping path, project and member scope, and the table's column filters (hours, billable, billable %, last activity, global search).
- **Date ranges are stored as a relative period** (`this_month`, `last_7_days`, `last_30_days`, `this_week`, `previous_month`) resolved when the preset is opened, so a preset named "Monthly billing" reports the current month every month. An explicit custom range remains available and is stored as absolute dates for presets that genuinely pin a window.
- The reports page gains the design's saved-reports bar: preset tabs with the active preset highlighted, an unsaved-changes dot when the current view differs from the loaded preset, `Save` (overwrite), `Save as new…` (name and create), and `New report` (reset to defaults).
- The report date control gains relative period options beside the existing custom range picker, because a preset cannot store a relative period the UI has no way to express.
- PM scope is unchanged and still enforced server-side: two users may open the same preset and see different rows if their report scope differs.

## Capabilities

### New Capabilities

- `saved-reports`: workspace-scoped named report presets — list, create, update, delete — carrying the report's date period, grouping path, identity scope, and column filters, with admin/PM authorization and per-workspace unique names.

### Modified Capabilities

- `admin-pages`: the "Reports Generation And Export" requirement gains the saved-reports bar — preset tabs, active-preset state, unsaved-changes tracking, save/save-as/new actions — and the date range control gains relative period presets alongside the custom range.

## Impact

Affected layers: shared contracts, backend, database, and frontend. This change adds contracts and a table; it does not change authentication behaviour.

- **Database**: new `saved_reports` table (`apps/api/src/reports/schemas/saved-reports.schema.ts`, registered in the `db/schema.ts` barrel) plus a Drizzle migration. `reports/` currently has no `schemas/` folder; this adds the first, matching every other feature module.
- `packages/shared/src/contracts/` — new saved-report contracts (config shape, relative period enum, create/update/list payloads); OpenAPI regenerates.
- `apps/api/src/reports/` — saved-reports service, controller, DTOs, module wiring, unit and e2e coverage.
- `apps/admin-web/src/` — saved-reports bar component, preset client and composable, dirty-state tracking, relative period options in the date control, `ReportsView.vue` wiring, tests.
- `docs/ui/pages-admin.md` — reports page documentation.

### Dependency on `admin-reports-redesign`

A preset's config stores the ordered `grouping` array and the billable-share / last-activity column filters, both of which exist only in the `admin-reports-redesign` change (PR #310, branch `fix/reports-update`). This change is branched from that work and must merge after it.
