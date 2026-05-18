## Why

The approved admin Members and Projects designs include the same table discovery treatment already implemented on the Reports page, but the current Members table has no search or column filters and the Projects table only has a standalone assigned-member filter. Adding these controls closes the parity gap and makes large workspace lists easier to scan without changing backend contracts.

## What Changes

- Add report-style global search controls to the Members and Projects table card headers with placeholders `Search members` and `Search projects`.
- Add desktop table filter rows under the Members and Projects column headers, aligned to the approved `.pen` designs and existing management-table filter-row pattern.
- Add mobile filter controls above the Members and Projects card lists so narrow viewports keep the same discovery capability.
- Apply filters locally to loaded table rows and card lists; clearing search or filters restores the full list allowed by the loaded data and user role.
- Preserve existing row actions, inline edit/assignment expansions, archive/unarchive behavior, loading, empty, and request-error states.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-members-page`: Add searchable and column-filterable Members table behavior for member identity, role, assigned projects, and last active.
- `admin-projects-page`: Expand the existing Projects table filtering from assigned-member-only to report-style global search plus column filters for project, source, assigned members, hours, and visibility.

## Impact

- Affected app code: `apps/admin-web/src/components/MembersTable.vue`, `apps/admin-web/src/components/ProjectsTable.vue`, and focused component tests.
- Affected shared UI surface: uses the existing `ManagementTableShell` filters slot from `@gitiempo/web-shared`; no shared component API change is expected unless implementation discovers a small reusable filter helper is warranted.
- Affected design references: `GITiempo.pen` screens `Admin Reports`, `Admin Members`, and `Admin Projects`.
- APIs/contracts: no backend, OpenAPI, database, or shared contract changes are expected; filters operate over already-loaded frontend data.
