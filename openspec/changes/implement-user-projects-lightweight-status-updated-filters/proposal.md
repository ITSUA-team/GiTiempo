## Why

GitHub issue #212 and the approved user Projects page design require the lightweight filter row to include structured task filters in addition to the existing combined search. The UI docs already define this behavior, so the app implementation needs a focused change that brings the shipped Projects page into alignment without expanding backend filtering scope.

## What Changes

- Keep the combined PrimeVue AutoComplete search field with placeholder `Search projects or tasks` on the user Projects page.
- Add frontend-only `Status` and `Updated` PrimeVue Select filters to the user Projects page filter row.
- Use `Status` options `All statuses`, `Open`, and `Closed`, matching the current user task status labels.
- Use `Updated` options `Any time`, `Today`, `Last 7 days`, and `Older`.
- Apply all filters to the already loaded visible projects and tasks only; do not add backend search/filter parameters or admin-style filters.
- Preserve grouped-by-project results, project-level `+ Add task` entry points, and page-level task creation behavior.
- Keep project-name matches showing the full matching project group, while task-name, status, and updated filters narrow task rows and remove groups with no remaining matching tasks.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-projects-list-page`: update user Projects list filtering requirements for lightweight status and updated filters on already loaded visible data.

## Impact

- Affected frontend app: `apps/user-web` Projects list route, filter state/computed results, task section rendering, and Projects page tests.
- Affected source of truth: OpenSpec `user-projects-list-page` capability, with implementation aligned to existing `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and the approved `GITiempo.pen` Projects screen.
- UI components: PrimeVue AutoComplete for combined search, and PrimeVue Select for status and updated filters.
- API/contracts: no backend, database, OpenAPI, or shared contract changes are expected; filtering remains frontend-only over loaded visible data.
