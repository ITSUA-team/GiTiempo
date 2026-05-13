## 1. Shared Navigation Contract

- [x] 1.1 Update `WorkspaceNavigation` item typing to accept app-provided icon metadata while keeping label, route target, and active-state ownership app-local.
- [x] 1.2 Render authenticated sidebar navigation as icon-only items with documented hit area, hover state, active state, tooltip copy, and accessible labels.
- [x] 1.3 Preserve mobile navigation accessibility and active-route indication after removing visible nav text.
- [x] 1.4 Add or update focused shared navigation tests for icon rendering, labels/tooltips, active state, and route target preservation.
- [x] 1.5 Update non-mobile authenticated sidebar width behavior to fit icon-only content while keeping mobile bottom navigation unchanged.

## 2. App Navigation Wiring

- [x] 2.1 Add documented user-web navigation icons for Dashboard, Time Entries, Projects, and Profile in the app-local nav item list.
- [x] 2.2 Add documented admin-web navigation icons for Dashboard, Reports, Invoices, Members, Projects, and Settings in the app-local nav item list.
- [x] 2.3 Verify the user-web Timer route remains absent from authenticated navigation.

## 3. Shared Row Action Surface

- [x] 3.1 Add or update a small shared row-action helper/component for icon-only PrimeVue-compatible action buttons with tooltip and accessible-label support.
- [x] 3.2 Preserve token-based brand, muted, and destructive icon treatments in the shared row-action styling.
- [x] 3.3 Support loading, disabled, and test-id passthrough for row actions that already expose those states.
- [x] 3.4 Add or update focused tests for shared row-action behavior and accessibility labels.

## 4. Page Row Action Adoption

- [x] 4.1 Replace user time-entry `Edit` and `Delete` visible text row buttons with icon-only row actions while preserving edit/delete events and delete loading state.
- [x] 4.2 Replace admin members `Assign PM`, `Edit`, and `Remove` visible text row buttons with icon-only row actions while preserving expansion and removal flows.
- [x] 4.3 Replace admin projects `Edit`, `Archive`, and `Unarchive` visible text row buttons with icon-only row actions while preserving edit/archive/unarchive flows.
- [x] 4.4 Update affected component tests to query by accessible labels or existing test IDs instead of visible row-action text.

## 5. Verification

- [x] 5.1 Perform design parity review against `GITiempo.pen` screens: Time Entries, Projects List, Admin Members, and Admin Projects.
- [x] 5.2 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck`.
- [x] 5.3 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [x] 5.4 Run relevant frontend tests for changed shared navigation/action components and affected page row actions.
- [x] 5.5 Re-run shared/app navigation verification after updating desktop/tablet sidebar width behavior.
