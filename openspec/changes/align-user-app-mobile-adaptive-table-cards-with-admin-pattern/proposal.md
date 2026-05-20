## Why

User-web table/list surfaces currently rely on fixed-width desktop tables with horizontal scrolling on mobile, while admin-web already uses a clearer adaptive pattern: desktop tables and mobile stacked record cards. Aligning user-web with that pattern improves mobile readability, keeps row actions accessible, and brings the remaining user record surfaces in line with the documented mobile requirement.

## What Changes

- Adapt user-web record-list surfaces so mobile viewports render stacked cards instead of fixed-width tables.
- Keep desktop/tablet behavior table-based with the existing PrimeVue/DataTable and `ManagementTableShell` patterns.
- Apply the mobile-card pattern to:
  - Dashboard recent time entries.
  - Projects page task sections.
  - Time Entries page day-grouped entries.
- Reuse or extract the existing admin mobile viewport/card pattern into shared frontend leaves when the behavior is identical across apps.
- Add viewport-focused tests covering mobile card rendering, desktop table rendering, action accessibility, and running-entry restrictions.
- No backend API or shared contract changes are intended.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Add mobile adaptive rendering requirements for user dashboard recent entries, project task rows, and time-entry rows while preserving existing desktop row content and actions.
- `frontend-shared-leaves`: Allow the proven admin mobile viewport/card primitives to become shared leaves used by both SPAs when the behavior remains presentational and identical.

## Impact

- Affected frontend code:
  - `apps/user-web/src/components/dashboard/DashboardRecentEntriesCard.vue`
  - `apps/user-web/src/components/projects/ProjectsTaskSection.vue`
  - `apps/user-web/src/components/time-entries/TimeEntriesDaySection.vue`
  - Related user-web component tests.
- Potential shared frontend code:
  - `packages/web-shared/src/components/*`
  - `packages/web-shared/src/*` viewport utility/composable exports.
- Admin-web impact is limited to import-path updates and regression verification if shared leaves are extracted from admin-local code.
- No API, database, OpenAPI, or `packages/shared` contract changes are expected.
