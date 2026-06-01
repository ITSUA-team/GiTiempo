## Why

Date and duration formatting rules are business-critical for time tracking, reports, filters, timer UI, report defaults, and project summaries, but related helper logic is currently split across frontend surfaces and backend services. Centralizing these rules now reduces timezone and duration drift before more pages and API paths depend on subtly different UTC/local calendar behavior.

## What Changes

- Introduce one shared frontend date/time utility owner backed by `date-fns` for reusable pure date, calendar-boundary, and duration helpers.
- Introduce one backend date/time utility owner for repeated API UTC calendar-boundary helpers used by report defaults and project tracked-hour summaries.
- Migrate duplicated frontend date/time helpers from `user-web` and `admin-web` surfaces to the shared owner while preserving existing user-visible labels and API query boundary semantics.
- Migrate duplicated backend UTC date helper logic to the backend owner while preserving report effective date windows and project summary windows.
- Keep domain-specific display wrappers app-local when they encode page vocabulary, but make those wrappers delegate shared date/time calculations and formatting primitives.
- Add regression coverage for UTC day keys, UTC ISO week windows, local DatePicker report ranges, elapsed/running durations, compact durations, and affected page/view-model consumers.
- Do not change backend time-entry or report API contracts, stored timestamps, generated OpenAPI endpoint shapes, database schema, auth/permissions, or visual layout.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-shared-leaves`: Define shared ownership for duplicated frontend date/time formatting and calendar-boundary helpers when the behavior is shared across frontend apps or repeated feature surfaces.
- `api-conventions`: Define shared backend ownership for duplicated API UTC calendar-boundary helpers while preserving documented report and project-summary semantics.

## Impact

- Affected frontend packages: `packages/web-shared` for shared browser/runtime date/time helpers, and `apps/user-web` / `apps/admin-web` consumers.
- Affected backend package: `apps/api` for backend-only UTC calendar-boundary helpers consumed by report and project services.
- Affected dependency graph: add `date-fns` to the frontend workspace location that owns the shared utility implementation and ensure consuming apps resolve it through workspace builds.
- Affected user-web surfaces: time-entry display helpers, Dashboard overview aggregates, top-bar timer elapsed display, Projects updated labels, and Time Entries filter date boundaries.
- Affected admin-web surfaces: reports date-range query conversion, report duration formatting, and report table filtering that searches formatted duration labels.
- Affected backend surfaces: report effective date defaults and project weekly/monthly tracked-hour summary windows.
- Affected specs: `openspec/specs/frontend-shared-leaves/spec.md` and `openspec/specs/api-conventions/spec.md` via change-local deltas.
- No DB migration, API contract shape, auth, permission, or OpenAPI endpoint shape change is planned.
