## Why

`user-web` currently mixes UTC-derived display/grouping helpers with browser-local `Date` behavior in PrimeVue DatePicker dialogs. A time entry can therefore show one time range in the list and a different local time in the edit popup for users outside UTC.

The desired product rule is that member-facing user app surfaces use the user's current browser-local timezone for display and local calendar boundaries. Existing workspace timezone settings remain scoped to workspace/admin calendar interpretation, and backend timestamps remain absolute ISO instants.

## What Changes

- Define browser-local timezone behavior for user-web Dashboard, Time Entries, Projects updated metadata, and Profile GitHub timestamps.
- Convert Time Entries date-range selections and day-level create presets around browser-local calendar days while continuing to submit ISO datetimes to the API.
- Keep backend/API/storage unchanged: `startedAt`, `endedAt`, `dateFrom`, and `dateTo` remain ISO instants, and backend filters continue to apply closed-open absolute timestamp boundaries.
- Update shared frontend date-time helper requirements so user-web member-facing surfaces are not forced to preserve UTC display/grouping semantics.
- Preserve admin/reporting and backend UTC semantics unless their own requirements explicitly change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: user-web member-facing dashboard, time-entry, and profile timestamp/calendar behavior.
- `user-projects-list-page`: browser-local task updated metadata labels.
- `frontend-shared-leaves`: shared date-time helper ownership must preserve surface-specific timezone semantics.

## Impact

- Affected docs/specs: `openspec/specs/user-pages`, `openspec/specs/user-projects-list-page`, `openspec/specs/frontend-shared-leaves`, and `docs/ui/pages-user.md`.
- Affected frontend implementation after proposal approval: user-web time-entry display/group/filter helpers, dashboard overview helpers, projects updated labels, profile GitHub timestamp rendering, and related tests.
- No backend endpoint shape, shared contract shape, OpenAPI, database, auth, permission, or workspace-settings change is planned.
