## Why

The approved admin Members and Projects designs include the same table discovery treatment already implemented on the Reports page, but the current Members table has no search or column filters and the Projects table only has a standalone assigned-member filter. Adding these controls closes the parity gap and makes large workspace lists easier to scan without changing backend contracts.

This branch also consolidates the related frontend date-boundary and management-table filter styling work that the implementation now depends on. Those changes are intentionally frontend-only: they preserve existing local-day and UTC-calendar semantics while documenting the new dependency surface in `admin-web`, `user-web`, and `@gitiempo/web-shared`.

## What Changes

- Add report-style global search controls to the Members and Projects table card headers with placeholders `Search members` and `Search projects`.
- Add desktop table filter rows under the Members and Projects column headers, aligned to the approved `.pen` designs and existing management-table filter-row pattern.
- Add mobile filter controls above the Members and Projects card lists so narrow viewports keep the same discovery capability.
- Apply filters locally to loaded table rows and card lists; clearing search or filters restores the full list allowed by the loaded data and user role.
- Preserve existing row actions, inline edit/assignment expansions, archive/unarchive behavior, loading, empty, and request-error states.
- Promote common management-table filter input/select styling helpers into `@gitiempo/web-shared` and reuse them from admin management tables.
- Normalize frontend date-boundary calculations with `date-fns` and `@date-fns/utc` where currently touched, preserving admin report/dashboard local-day semantics, shared report export query serialization, and user-web UTC calendar handling.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-members-page`: Add searchable and column-filterable Members table behavior for member identity, role, assigned projects, and last active.
- `admin-projects-page`: Expand the existing Projects table filtering from assigned-member-only to report-style global search plus column filters for project, source, assigned members, hours, and visibility.
- `admin-pages`: Preserve report export local-day query-boundary behavior while moving the frontend date helpers to `date-fns`.
- `user-pages`: Preserve user dashboard and time-entry UTC calendar windows while moving repeated frontend date calculations to `date-fns` and `@date-fns/utc`.
- `user-projects-list-page`: Preserve UTC-based updated metadata labels while moving date calculations to `date-fns` and `@date-fns/utc`.
- `frontend-shared-leaves`: Add shared management-table filter styling helpers and document shared report export date-range serialization behavior in `@gitiempo/web-shared`.

## Impact

- Affected admin app code: `apps/admin-web/src/components/MembersTable.vue`, `apps/admin-web/src/components/ProjectsTable.vue`, `apps/admin-web/src/components/reports/ReportsTable.vue`, admin report/dashboard view-model date helpers, related view loading states, and focused component/unit tests.
- Affected user app code: user dashboard overview, Projects page updated metadata labels, and Time Entries date filtering/day-label helpers.
- Affected shared frontend code: `@gitiempo/web-shared` management-table helper exports and shared report filter form validation/query construction.
- Dependency impact: `date-fns` is added where local date helpers now use it, and `@date-fns/utc` is added to `user-web` for UTC calendar calculations.
- Affected design references: `GITiempo.pen` screens `Admin Reports`, `Admin Members`, and `Admin Projects`.
- APIs/contracts: no backend, OpenAPI, database, or `packages/shared` contract shape changes are expected; filters operate over already-loaded frontend data. The shared frontend report export query-construction behavior in `@gitiempo/web-shared` is explicitly in scope and must preserve the documented request-boundary semantics.
