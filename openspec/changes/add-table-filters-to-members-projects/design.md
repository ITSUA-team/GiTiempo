## Context

This change affects `apps/admin-web` only. The relevant app guidance is `apps/admin-web/AGENTS.md`, with UI requirements from `docs/ui/INDEX.md`, `docs/ui/components.md`, and `docs/ui/pages-admin.md`.

The approved `GITiempo.pen` screens show these parity targets:

- `Admin Reports`: the Results card uses a right-aligned global search and a table filter row under the header.
- `Admin Members`: the Members Table card uses `Search members` in the header and a filter row with Member, Role, Projects Assigned, and Last Active filters; the Actions column has no filter.
- `Admin Projects`: the Projects Table card uses `Search projects` in the header and a filter row with Project, Source, Assigned members, Hours, and Visibility filters; the Actions column has no filter.

Current implementation state:

- `ReportsTable.vue` already implements the target interaction pattern with local filter state, a global search, mobile filter controls, and a `ManagementTableShell` filter slot.
- `MembersTable.vue` renders the approved columns and row actions but has no global search or column filters.
- `ProjectsTable.vue` has a standalone assigned-member select above the table/card list, but it does not match the approved report-style search and filter-row treatment.
- `ManagementTableShell.vue` already provides a filter-row slot, so the implementation can reuse existing table chrome without changing shared component APIs.

## Goals / Non-Goals

**Goals:**

- Bring Members and Projects table discovery controls into parity with the approved `.pen` designs and the existing Reports table pattern.
- Keep filtering frontend-only over already-loaded members, projects, and workspace members data.
- Preserve existing row actions, inline expansions, mutation flows, loading behavior, request-error handling, and empty states.
- Cover the user-visible filter behavior with focused admin-web component tests.

**Non-Goals:**

- No backend, database, OpenAPI, or shared contract changes.
- No server-side free-text search endpoint.
- No change to role scope or which rows are loaded for admins or PMs.
- No redesign of table columns, row action icons, stats cards, or page headers.

## Decisions

### Use local computed view models for filtering

Members and Projects tables will keep their own typed filter state and derive filtered rows with `computed` values. This matches the Reports page approach, keeps table search independent from backend scope, and avoids changing API contracts.

Project fit: `docs/ui/components.md` allows native PrimeVue DataTable filters by default, but explicitly treats local computed filtering as the accepted equivalent when a table uses the shared `ManagementTableShell` with custom headers and hidden native DataTable headers.

Alternative considered: use PrimeVue DataTable built-in filtering. This does not fit the current `ManagementTableShell` architecture because the app renders custom header and filter rows while hiding PrimeVue's native headers.

### Define concrete filter option semantics

Members last-active options use browser-local time:

- `Any activity`: no last-active restriction.
- `Active today`: valid `lastActiveAt` on the current browser-local calendar day.
- `Active this week`: valid `lastActiveAt` from browser-local Monday `00:00` through the current time.
- `No activity`: missing or invalid `lastActiveAt`.

Projects hours options use each loaded row's `totalHours` value:

- `Any`: no hours restriction.
- `Tracked`: `totalHours > 0`.
- `40h+`: `totalHours >= 40`.
- `No hours`: `totalHours === 0`.

### Reuse the existing management-table filter row

Both tables will render filter controls through the `ManagementTableShell` `#filters` slot. Desktop control sizing should follow the approved `.pen` row widths and column alignment. Mobile filters should render above the card list so mobile users retain the same search and column-filter capability.

Alternative considered: leave the Projects assigned-member select above the card as-is and add only missing filters. That would preserve existing behavior but continue to conflict with the approved Projects design and with the report-style pattern requested for both pages.

### Keep controls PrimeVue-based and token-styled

Use PrimeVue inputs/selects/multiselects with token-backed Tailwind classes and `pt` overrides, following `docs/ui/components.md`. Text filters should use `InputText`, single-choice filters should use `Select`, and assignment filters should use `MultiSelect` where multiple projects or members can be selected.

Alternative considered: use custom static filter cells. That would be visually simple but would violate the project's PrimeVue-first control rule and make accessibility/keyboard behavior worse.

### Derive assignment filter data from loaded page data

Project table member filters can use each project row's `members` array. Member table project filters can derive member-to-project assignments from the `projects` prop, which is already loaded for the assignment panel. The visible assignment-count column remains backed by `projectsAssignedCount`.

Alternative considered: add project assignment details to the member list API. That is unnecessary for this UI change because the page already fetches projects and no contract change is required.

## Risks / Trade-offs

- Local filtering can become expensive for very large workspaces -> Mitigation: keep derivation simple, case-normalized, and computed from existing arrays; revisit backend filtering only when dataset size requires it.
- Filtered rows with an expanded edit/assignment row can leave stale expansion state hidden -> Mitigation: collapse or reconcile expanded rows when active filters exclude the expanded row.
- Date-relative Last Active filters can be time-zone sensitive -> Mitigation: define filters using the browser's local day/week semantics and cover deterministic fixture dates in tests.
- Member assigned-project filters depend on loaded project membership data -> Mitigation: keep the filter disabled or empty only if project data is unavailable; this page already loads projects before rendering the table.
