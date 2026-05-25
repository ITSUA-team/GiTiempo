## Why

The current authenticated `user-web` top-bar timer is documented as a compact center-region surface, but the mobile shell needs a selected design that keeps timer controls usable alongside the profile menu and bottom navigation. The approved `GITiempo.pen` mobile timer frame now identifies a dropdown-safe direction that should be captured before implementation.

## What Changes

- Analyze and adopt the selected `GITiempo.pen` mobile timer design: `Mobile Timer - Selected Safe F`.
- Update the user-web mobile top-bar timer behavior so Start/Stop and Change actions remain available even when the profile menu opens from the top-right identity area.
- Keep the timer task-picker dialog usable in the mobile timer flow with a near-full-width, scrollable dialog and full-width stacked footer actions.
- Preserve the existing desktop/tablet top-bar timer behavior and admin-web shell behavior.
- Keep timer task selection, loading, error, no-eligible-task, idle, and running semantics unchanged.
- Add focused tests for mobile timer layout, dropdown-safe action availability, and existing desktop behavior preservation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: Clarifies mobile user-web shell timer placement and profile-menu-safe interaction requirements while preserving desktop top-bar behavior.
- `user-pages`: Clarifies the user-web global top-bar timer mobile rendering requirements across idle, running, loading, disabled, and task-picker states.
- `frontend-shared-leaves`: Clarifies that the shared authenticated header may render an app-owned center slot as a mobile row without owning user-web timer state or affecting admin-web.

## Impact

- Affected frontend app: `apps/user-web` shell timer component, timer task-picker dialog, and focused component tests.
- Affected shared package: `packages/web-shared` shared `WorkspaceHeader`, with admin-web regression verification because admin-web renders the same shared header.
- Affected design source: selected `GITiempo.pen` frame `Mobile Timer - Selected Safe F` (`qTKvU`).
- Affected docs/specs: `docs/ui/layout.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, plus layout, user-pages, and frontend-shared-leaves OpenSpec deltas for mobile timer behavior and mobile task-picker dialog behavior.
- Not affected: backend API, database, shared contracts, OpenAPI output, admin-web product behavior, admin-web timer behavior, or route maps.
