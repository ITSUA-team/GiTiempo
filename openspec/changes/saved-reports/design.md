## Context

The reports page holds its view state in `apps/admin-web/src/composables/reports/useReportFilters.ts` (date range, ordered grouping array) and `report-view-model.ts` (`ReportTableFilters`: project, member, hours, billable, billable share, last activity, global search). None of it survives a reload. The approved `savedReportsBar` frame (GITiempo.pen "Admin Reports V2", node `kT0h1`) sits at the top of the page content, above the summary cards, and is laid out as: a `Saved reports` label, a row of 32px pill tabs (active pill `#E8E1F5` fill with a `bookmark` icon and `#5D2B85` 600-weight label; inactive pills white with a `#EEEEEE` border and `#666666` 500-weight label), a `+ New report` pill, and on the right an unsaved-changes dot (`#F57F17`) with label, a `Save` button (`#E8E1F5` fill, `save` icon), and a `Save as new…` text action.

Per `apps/api/AGENTS.md`, contract changes flow through `packages/shared` and OpenAPI regenerates via the build-based workflow. Feature schemas live in `<module>/schemas/*.schema.ts` and are re-exported from `db/schema.ts`. Per `apps/admin-web/AGENTS.md`, follow `docs/ui/INDEX.md`, implement pixel-perfect to the approved frame, and prefer PrimeVue components.

## Goals / Non-Goals

**Goals:**

- Named, workspace-shared report presets: list, create, overwrite, rename, delete.
- A preset restores the whole view — period, grouping path, identity scope, column filters — in one click.
- Presets stay meaningful over time: a relative period re-resolves on open.
- Honest dirty tracking: the indicator lights up only when the current view actually differs from the loaded preset.

**Non-Goals:**

- Per-user private presets or per-preset permissions (decided: workspace-shared, any admin/PM may edit — see D1).
- Scheduling, emailing, or subscribing to a report.
- Sharing a preset by URL, or deep-linking report state into the query string.
- Reordering or pinning tabs; presets list in a fixed order (see D6).
- Saving export format — export stays a per-action choice.

## Decisions

### D1: Presets are workspace-shared, editable by any admin or PM

One row per preset scoped by `workspace_id`, with `created_by` recorded for attribution only. Names are unique per workspace, so "Monthly billing" means one thing to everyone.

Rationale: the design's tab names ("Monthly billing", "Team workload", "Client hours") are team vocabulary, not personal scratch space, and tabs shown to everyone are only coherent if everyone sees the same list. Author-only editing was considered and rejected: presets would go stale the moment their author left, and the reports surface already trusts admins and PMs with export of the same data.

PM scope is unaffected. A preset stores *filters*, not rows; the report still runs through the existing scoped query, so a PM opening a shared preset sees only their scope.

### D2: The date range is a discriminated union — relative period or absolute window

```
dateRange:
  | { kind: 'relative', period: 'this_week' | 'this_month' | 'previous_month' | 'last_7_days' | 'last_30_days' }
  | { kind: 'absolute', dateFrom: string, dateTo: string }
```

Relative is the default and the one the design implies: a preset named "Monthly billing" that reports May forever is worse than useless, because it looks current. The period is resolved to a concrete window at open time, in the user's local calendar, using the same helpers the Last-activity filter already uses (`getLocalDateKey`).

Absolute stays available because pinning a closed quarter is a real need, and the current date control only speaks absolute ranges.

Consequence: the date control must gain relative period options, otherwise the UI cannot express a state the contract can store. This is the one piece of new surface beyond the design frame, and it belongs beside the existing custom range picker.

### D3: The preset config is one validated JSON column, not a wide table

`config jsonb not null`, parsed through a shared Zod schema on read and write.

Rationale: the config is a snapshot of client view state whose shape is already defined by `ReportTableFilters` and the grouping contract, and it changes whenever the reports page gains a filter. A column per filter would mean a migration for every future filter and would still not model the grouping array cleanly. The tradeoff — no SQL querying inside a config, no referential integrity on `projectId`/`memberId` — is acceptable: nothing queries across configs, and a preset pointing at a deleted project resolves to "All" on load rather than erroring (see Risks).

Validation is not optional. The column is written only through the shared schema, so a malformed config cannot enter, and rows are re-validated on read so an older config shape surfaces as a clear error rather than a broken page.

### D4: Dirty tracking compares normalised config objects, in the client

On load, the resolved preset config is kept as `loadedConfig`. The bar shows "Unsaved changes" when `normalise(currentConfig)` differs from `normalise(loadedConfig)` by deep equality. Normalisation sorts nothing (grouping order is meaningful) but coerces absent/`null`/`'any'` filter values to a single canonical form, so "no filter" never reads as a change.

Rationale: the alternative — tracking dirtiness per control with individual watchers — drifts the moment a filter is added, and would report a change when a user toggles a filter and toggles it back.

An absolute-vs-relative subtlety: a relative preset resolves to concrete dates on open, so comparison happens on the *stored* shape (`{kind:'relative', period}`), never on the resolved window. Otherwise every relative preset would read as dirty the day after it was saved.

### D5: `Save` overwrites, `Save as new…` prompts for a name, `New report` resets

`Save` is enabled only when a preset is loaded and the view is dirty. `Save as new…` always available, opens a name prompt, and rejects a duplicate name with the server's uniqueness error surfaced inline. `New report` clears the active preset and resets every control to defaults — it does not create a row, so an unnamed exploratory view costs nothing.

Delete and rename are not in the design frame. They ship as a small overflow menu on the active tab, because a create-only preset list is a one-way door; this is called out as a deliberate addition to the approved design per the `apps/admin-web/AGENTS.md` deviation rule.

### D6: Presets list newest-first by creation, and the list is not reorderable

No `position` column. Ordering by `created_at` is stable, needs no extra writes, and avoids the reorder-conflict problem that a shared, concurrently-edited list would otherwise have. Revisit if workspaces accumulate enough presets that the bar wraps.

## Risks / Trade-offs

- [A preset references a project or member that was later deleted or deactivated] → resolve on load: an identity that no longer exists in the user's option list falls back to "All" and the bar shows a one-time inline notice. Never error, never silently filter to nothing.
- [Two admins overwrite the same preset] → last write wins, which matches every other admin surface in the app. `updated_at` and `created_by` make it traceable; optimistic locking is disproportionate for a filter set.
- [A PM saves a preset scoped to a project only they can see] → the preset is visible to everyone, but the project filter resolves through each viewer's own scope, so an out-of-scope viewer sees it fall back to "All" per the rule above. The preset leaks a project *name* to that extent — acceptable, since project names are already visible workspace-wide through the reports filter options.
- [`config` shape drift as the reports page gains filters] → the shared Zod schema is versioned by tolerance, not by a version field: unknown keys are stripped and missing keys take their documented default, so an older preset keeps working when a filter is added. A breaking config change would need a migration, and the spec records that.
- [Relative periods and timezones] → resolved in the viewer's local calendar, consistent with how the Last-activity filter and the Last-activity column already behave. Two users in different zones may see windows that differ by a day; this matches the rest of the reports page rather than introducing a second convention.
- [Bar width with many presets] → tabs are fixed-height pills in a single row; beyond roughly six the row would wrap. Ship as-is and revisit with an overflow menu if it becomes real.

## Planned file changes

**packages/shared**

- `src/contracts/saved-reports.ts` (new): `savedReportPeriodSchema`, `savedReportDateRangeSchema` (discriminated union), `savedReportConfigSchema` (dateRange, grouping path, projectId, memberId, table filters), `savedReportSchema`, create/update payloads, list response; `saved-reports.spec.ts`.
- `src/contracts/index.ts`: export the new module.
- `openapi.json`: regenerated (build-based workflow).

**apps/api**

- `src/reports/schemas/saved-reports.schema.ts` (new): `saved_reports` table — `id` uuid pk, `workspace_id` fk restrict, `created_by` fk, `name` varchar(120), `config` jsonb, `created_at`/`updated_at`; unique index on (`workspace_id`, lower(`name`)), index on `workspace_id`.
- `src/db/schema.ts`: re-export the new schema.
- `migrations/0015_*.sql`: generated by drizzle-kit.
- `src/reports/services/saved-reports.service.ts` + spec: list, create, update, delete, with workspace scoping and duplicate-name handling via `postgres-errors.ts`.
- `src/reports/controllers/saved-reports.controller.ts` + DTOs: `GET/POST /reports/saved`, `PATCH/DELETE /reports/saved/:id`, admin+PM guard consistent with the existing reports controller.
- `src/reports/reports.module.ts`: register the service and controller.
- `test/saved-reports.e2e-spec.ts`: CRUD, workspace isolation, duplicate name 409, member 403, config validation 400.

**apps/admin-web**

- `src/services/admin-saved-reports-client.ts` (new) + spec.
- `src/composables/reports/useSavedReports.ts` (new): list query, active preset, dirty comparison, save/save-as/delete mutations; spec.
- `src/lib/saved-report-config.ts` (new): build config from current state, apply config to state, resolve relative period to a concrete range, normalise for comparison; spec — this is the pure core and carries most of the test weight.
- `src/components/reports/SavedReportsBar.vue` (new) + spec: the design frame.
- `src/components/reports/ReportsTable.vue` / date control: relative period options.
- `src/views/ReportsView.vue`: mount the bar, wire apply/save; spec.

**docs**

- `docs/ui/pages-admin.md`: saved reports bar, preset semantics, relative periods.

## Backend/frontend coordination

The config contract lands in `packages/shared` first and is the single definition both layers validate against — the API stores exactly what the client builds, and neither side owns a private copy of the shape. The API can deploy before the UI: with no presets and no bar, nothing calls the endpoints. The reverse is not true, so the API half must merge first or together.

This change branches from `fix/reports-update` (PR #310) because the preset config embeds the ordered grouping array and the new column filters. It must not merge to `main` before that change.

## Open Questions

- Should `New report` also clear the date range back to the default month, or preserve the current window? Leaning preserve-window (less surprising mid-analysis); confirm during implementation against the design frame's intent.
