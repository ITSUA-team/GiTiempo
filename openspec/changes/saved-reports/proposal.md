## Why

The reports redesign preserves configurable grouping and table filters only for the current browser session. Named workspace presets keep that report setup reusable across the team.

## What Changes

- Add workspace-shared saved-report presets with protected CRUD API endpoints for admins and PMs.
- Persist a preset's concrete absolute `dateRange`, grouping path, project/member scope, and table filters.
- Show the approved saved-reports bar above report summary cards, with active, dirty, save, save-as-new, rename, delete, and new-report flows.
- Retire relative date periods from the shared contract and Reports UI. A one-time database migration resolves existing valid relative configs to absolute UTC date windows when it runs.

## Capabilities

### New Capabilities

- `saved-reports`: workspace-scoped named presets with an absolute date range, grouping path, identity scope, column filters, and admin/PM access.

### Modified Capabilities

- `admin-pages`: reports gains the saved-reports bar and presets restore only the date picker’s absolute range.

## Impact

- `packages/shared`: saved-report schema, generated OpenAPI contract, and parsing tests.
- `apps/api`: validated saved-report reads/writes plus the JSON-data migration.
- `apps/admin-web`: no separate relative-period state or selector; presets use the existing date-range state.
- `docs/ui/pages-admin.md`: documents absolute-only preset semantics.
