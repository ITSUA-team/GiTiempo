## Why

The current authenticated `user-web` top-bar timer is documented as a compact center-region surface, but the mobile shell needs a selected design that keeps timer controls usable alongside the profile menu and bottom navigation. The approved `GITiempo.pen` mobile timer frame now identifies a dropdown-safe direction that should be captured before implementation.

## What Changes

- Analyze and adopt the selected `GITiempo.pen` mobile timer design: `Mobile Timer - Selected Safe F`.
- Update the user-web mobile top-bar timer behavior so Start/Stop and Change actions remain available even when the profile menu opens from the top-right identity area.
- Preserve the existing desktop/tablet top-bar timer behavior and admin-web shell behavior.
- Keep timer task selection, loading, error, no-eligible-task, idle, and running semantics unchanged.
- Add focused tests for mobile timer layout, dropdown-safe action availability, and existing desktop behavior preservation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: Clarifies mobile user-web shell timer placement and profile-menu-safe interaction requirements while preserving desktop top-bar behavior.
- `user-pages`: Clarifies the user-web global top-bar timer mobile rendering requirements across idle, running, loading, disabled, and task-picker states.

## Impact

- Affected frontend app: `apps/user-web` shell timer component and focused component tests.
- Affected design source: selected `GITiempo.pen` frame `Mobile Timer - Selected Safe F` (`qTKvU`).
- Affected docs/specs: layout and user-pages OpenSpec deltas for mobile timer behavior.
- Not affected: backend API, database, shared contracts, OpenAPI output, admin-web timer behavior, or route maps.
