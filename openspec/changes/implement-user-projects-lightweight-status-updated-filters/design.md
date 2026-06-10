## Context

The user Projects page currently loads visible active projects, fetches active tasks for each project, builds grouped project/task sections, and applies a single frontend-only combined search through `apps/user-web/src/composables/projects/useProjectsSearch.ts` and `apps/user-web/src/lib/projects-page-helpers.ts`. `ProjectView.vue` renders that search as a PrimeVue AutoComplete above grouped `ProjectsTaskSection` cards/tables.

GitHub issue #212, `docs/ui/pages-user.md`, and `docs/ui/patterns.md` now require the same lightweight filter row to include `Status` and `Updated` filters while keeping filtering frontend-only over already loaded visible data. The nearest app guidance is `apps/user-web/AGENTS.md`; implementation should use PrimeVue controls, preserve the grouped Projects page structure, and treat `GITiempo.pen` as the approved visual parity source. The Pencil MCP could not inspect the `.pen` file in this session because no design file is open in the editor, so implementation should perform a direct design parity pass when the file is available.

Planned file changes are app-local to `apps/user-web`: the Projects route view, the existing Projects search/filter composable, Projects page helper functions, and focused tests. No shared package, backend, API contract, database, or OpenAPI changes are planned.

## Goals / Non-Goals

**Goals:**

- Add `Status` and `Updated` PrimeVue Select filters to the user Projects page filter row.
- Keep the combined `Search projects or tasks` filter and its current project-match and task-match semantics.
- Apply search, status, and updated filters to already loaded visible project/task data on the frontend.
- Preserve grouped-by-project rendering, project-level `+ Add task`, and page-level task creation entry points.
- Keep task status labels aligned to the user task UI: `Open` and `Closed`.
- Cover filter helper behavior and route-level wiring with focused tests.

**Non-Goals:**

- No backend filtering, search query parameters, endpoint changes, shared contract changes, or persisted filter state.
- No admin-style filters such as source, members, visibility, or billable-default.
- No broad Projects page rewrite, task dialog rewrite, or task mutation behavior change.
- No change to which tasks are loaded by default; inactive tasks remain excluded from the default grouped list.
- No `.pen` design edits.

## Decisions

### Extend The Existing Projects Filter Boundary

Extend the current `useProjectsSearch`/Projects helper boundary to own the new status and updated selections instead of introducing a new store or backend-backed query layer. The existing composable already derives `filteredProjectGroups` from loaded project/task data, which is the right ownership boundary for frontend-only filtering.

Alternative considered: add a second composable only for structured filters. That would split one derived list across two owners and make the project-match/task-match ordering easier to regress.

### Use Typed Single-Select Option Objects

Represent `Status` and `Updated` values as small typed option objects with stable internal values, labels used by the UI, and default selections for `All statuses` and `Any time`. Render them as PrimeVue `<Select>` controls because the fixed status and updated buckets are explicit exceptions to the predictive single-select rollout.

Alternative considered: raw string refs. Typed option values make test cases and filter predicates less dependent on display copy while still preserving the required labels.

Alternative considered: PrimeVue `<AutoComplete dropdown forceSelection>`. Rejected for `Status` and `Updated` because these fixed filter buckets should remain compact Select controls per the updated #216 follow-up direction.

### Apply Search First, Then Structured Task Filters

Filtering order should be:

- Build groups from loaded visible active projects and their loaded tasks.
- Apply combined search semantics first: a project-name match keeps the full project group, while a task-name match keeps only matching task rows in the parent group.
- Apply `Status` and `Updated` filters to the resulting task rows.
- Remove project groups with no remaining matching task rows after structured filters.

This preserves the documented search behavior while satisfying the requirement that status and updated filters continue narrowing task rows even when the text search matched a project name.

### Define Updated Buckets With Browser-Local Time

Classify task `updatedAt` timestamps using the browser-local timezone utilities already used by `formatUpdatedLabel`.

- `Any time`: no updated-date filtering.
- `Today`: task updated during the current browser-local calendar day.
- `Last 7 days`: task updated within the rolling seven-day browser-local window, including today.
- `Older`: task updated before that seven-day window.

This keeps the filter consistent with the existing user-facing updated metadata and avoids UTC-day boundary regressions.

### Keep Suggestions Built From Loaded Visible Data

Search suggestions should continue to come from the loaded visible projects and tasks rather than from backend search or admin metadata. Structured filters can still narrow the final rendered rows after a suggestion is selected.

### Update Empty And Loading Surfaces For The Filter Row

The loading skeleton should approximate the expanded filter row, and the filtered empty state should refer to clearing filters instead of only clearing search. Request-error handling remains distinct and unchanged.

## Risks / Trade-offs

- Browser-local date boundaries can be off by one around midnight or timezone changes -> Mitigate with helper tests that stub timezone/current time and cover Today, Last 7 days, and Older.
- Project-name matches could accidentally bypass status/updated filters -> Mitigate with tests where a project name matches but only some child tasks satisfy the structured filters.
- PrimeVue Select emits option objects for `Status` and `Updated`, while the combined AutoComplete can emit strings or option objects -> Mitigate by normalizing option values in the composable and testing reset/default behavior.
- The filter row can become cramped on mobile -> Mitigate with responsive wrapping/stacking that keeps all labels and controls visible while preserving desktop `.pen` parity.
- Search suggestions may show loaded items that are later hidden by active structured filters -> Accept this because suggestions are defined over loaded visible data, while final rendered rows are defined by the full active filter set.
