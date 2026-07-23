## Context

Saved reports persist the report view above the approved `savedReportsBar` frame (`kT0h1`) in the Admin Reports design. The design includes no relative-period control; the existing range picker is the sole date input.

## Decisions

### D1: Presets are workspace-shared

One `saved_reports` row is scoped by `workspace_id`; any admin or PM can use, edit, or delete it. The server remains the source of truth for PM data scope.

### D2: Saved report dates are absolute only

```ts
dateRange: {
  kind: 'absolute';
  dateFrom: string;
  dateTo: string;
}
```

There is no `selectedReportPeriod`, relative enum, or relative selector. The reports page already owns a concrete `dateRange`, so a second representation adds duplicated state and drift risk.

Existing valid relative configs are migrated once. The migration resolves their period with the UTC calendar day at migration execution, writes an absolute midnight-UTC window, and updates `updated_at`. This deterministic policy cannot reconstruct the original viewer timezone, but prevents any relative shape from remaining after the contract change.

### D3: Config remains a validated JSON document

`config jsonb not null` is parsed through the shared Zod schema on every read and write. Unknown keys are stripped and missing filter keys default, but `dateRange` is required because a saved preset must restore a concrete date window.

### D4: Dirty comparison uses normalized stored config

`normaliseConfig(currentConfig)` is compared to the loaded config. Grouping order remains meaningful; absent/`null`/`any` filter values normalize consistently. Because ranges are already absolute, no period-resolution exception exists.

### D5: Save, save-as-new, and new report

`Save` overwrites an active dirty preset. `Save as new…` creates a named preset and reports duplicate-name conflicts inline. `New report` clears the active preset and resets grouping, scope, and filters while retaining the current date range.

## Risks / Trade-offs

- A project or member no longer in viewer scope falls back to unfiltered and is reported inline.
- Presets migrated from relative periods become fixed windows by design; the migration time and UTC policy are documented above.
- Concurrent preset edits use last-write-wins, matching the surrounding admin surface.
- The tab row may wrap with many presets; defer an overflow design until needed.

## Planned File Changes

- `packages/shared/src/contracts/saved-reports.ts`: absolute-only date range and contract tests.
- `apps/api/drizzle/0017_normalize_saved_report_date_ranges.sql`: convert known relative configs.
- `apps/admin-web/src/lib/saved-report-config.ts`, `ReportsTable.vue`, and `ReportsView.vue`: remove the duplicate relative-period state and UI.
- `docs/ui/pages-admin.md`: absolute-only date guidance.
