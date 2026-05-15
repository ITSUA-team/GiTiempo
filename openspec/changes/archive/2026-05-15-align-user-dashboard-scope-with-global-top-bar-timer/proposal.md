## Why

The current user dashboard sources disagree about timer ownership: the UI docs and approved design place timer controls in the authenticated global top bar, while the user-pages spec still requires a prominent in-page dashboard timer widget. This change aligns the spec with the approved MVP direction so the dashboard can be implemented safely without reintroducing duplicate timer controls.

## What Changes

- Update the user dashboard requirement to rely on the global top-bar timer for active timer state, start, stop, and task-context selection.
- Define the dashboard page content as an overview surface with header, loading skeleton, weekly focus insight, recent time entries, empty/error states, and optional stats cards.
- Remove the spec expectation that the dashboard page content itself shows a prominent active timer widget or stop action.
- Record the accepted MVP dashboard data strategy: compute current-week overview data from existing paginated own-entry endpoints by loading all current-week pages before deriving weekly focus and stats.
- Preserve existing backend API contracts; dashboard implementation should consume existing time-entry/project data unless a later change explicitly adds aggregate endpoints.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Align the User Dashboard Overview requirement with global top-bar timer ownership and the approved dashboard overview content.

## Impact

- Specs: `openspec/specs/user-pages/spec.md` dashboard scenarios.
- UI docs/design alignment: `docs/ui/pages-user.md`, `docs/ui/layout.md`, and the approved `GITiempo.pen` User Dashboard screen become consistent with OpenSpec.
- Frontend: implementation work in `apps/user-web/src/views/DashboardView.vue` can focus on dashboard overview content instead of duplicate timer controls while staying within existing client and contract boundaries.
- API/contracts: no planned contract or endpoint shape changes.
