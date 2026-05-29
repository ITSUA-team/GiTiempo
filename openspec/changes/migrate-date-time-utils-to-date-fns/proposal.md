## Why

Date and duration formatting rules are business-critical for time tracking, reports, filters, and timer UI, but related helper logic is currently split across frontend surfaces such as user time-entry displays and admin report view models. Centralizing these rules now reduces timezone and duration drift before more pages depend on subtly different UTC/local calendar behavior.

## What Changes

- Introduce one shared frontend date/time utility owner backed by `date-fns` for reusable pure date, calendar-boundary, and duration helpers.
- Migrate duplicated frontend date/time helpers from `user-web` and `admin-web` surfaces to the shared owner while preserving existing user-visible labels and API query boundary semantics.
- Keep domain-specific display wrappers app-local when they encode page vocabulary, but make those wrappers delegate shared date/time calculations and formatting primitives.
- Add regression coverage for UTC day keys, UTC ISO week windows, local DatePicker report ranges, elapsed/running durations, compact durations, and affected page/view-model consumers.
- Do not change backend time-entry or report API contracts, stored timestamps, generated OpenAPI, database schema, or visual layout.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-shared-leaves`: Define shared ownership for duplicated frontend date/time formatting and calendar-boundary helpers when the behavior is shared across frontend apps or repeated feature surfaces.

## Impact

- Affected frontend packages: `packages/web-shared` for shared browser/runtime date/time helpers, and `apps/user-web` / `apps/admin-web` consumers.
- Affected dependency graph: add `date-fns` to the frontend workspace location that owns the shared utility implementation and ensure consuming apps resolve it through workspace builds.
- Affected user-web surfaces: time-entry display helpers, Dashboard overview aggregates, top-bar timer elapsed display, Projects updated labels, and Time Entries filter date boundaries.
- Affected admin-web surfaces: reports date-range query conversion, report duration formatting, and report table filtering that searches formatted duration labels.
- Affected specs: `openspec/specs/frontend-shared-leaves/spec.md` via a change-local delta.
- No backend, DB migration, API contract, auth, permission, or OpenAPI export change is planned.
